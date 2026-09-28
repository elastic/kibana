/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface TimeWindow {
  readonly fromMs: number;
  readonly toMs: number;
}

export type ActivityHistoryPlan =
  | {
      readonly status: 'ready';
      readonly mode: 'weekly' | 'daily';
      /** Weeks (weekly) or days (daily) between consecutive references. */
      readonly spacing: number;
      /** Most recent first. */
      readonly references: readonly TimeWindow[];
    }
  | { readonly status: 'unassessable'; readonly reason: 'insufficient-history' | 'clock-change' };

// Shifts local wall time, so references keep the same hours; a clock change inside changes the duration.
const shiftWindow = (
  { fromMs, toMs }: TimeWindow,
  timeZone: string,
  amount: number,
  unit: 'weeks' | 'days'
): TimeWindow => ({
  fromMs: moment.tz(fromMs, timeZone).subtract(amount, unit).valueOf(),
  toMs: moment.tz(toMs, timeZone).subtract(amount, unit).valueOf(),
});

/**
 * Plans six references of the same local hours: weekly, spaced so they never overlap the view or each other, or,
 * only when the data do not reach back far enough, daily for views of at most one day.
 */
export const planActivityHistory = ({
  view,
  timeZone,
  earliestMs,
  referenceCount = 6,
}: {
  readonly view: TimeWindow;
  readonly timeZone: string;
  /** Earliest timestamp of the query's sources: a seniority check, not a guarantee of coverage. */
  readonly earliestMs: number | null;
  readonly referenceCount?: number;
}): ActivityHistoryPlan => {
  const duration = view.toMs - view.fromMs;
  const build = (unit: 'weeks' | 'days', spacing: number): TimeWindow[] =>
    Array.from({ length: referenceCount }, (_, index) =>
      shiftWindow(view, timeZone, (index + 1) * spacing, unit)
    );
  const hasClockChange = (references: readonly TimeWindow[]): boolean =>
    references.some(({ fromMs, toMs }) => toMs - fromMs !== duration);
  const reaches = (references: readonly TimeWindow[]): boolean =>
    earliestMs !== null && earliestMs <= references[references.length - 1].fromMs;

  const spacingWeeks = Math.max(1, Math.ceil(duration / WEEK_MS));
  // Six references spaced farther apart would exceed the six-week history budget.
  if (spacingWeeks > 1) return { status: 'unassessable', reason: 'insufficient-history' };
  const weekly = build('weeks', spacingWeeks);
  if (hasClockChange(weekly)) return { status: 'unassessable', reason: 'clock-change' };
  if (reaches(weekly)) {
    return { status: 'ready', mode: 'weekly', spacing: spacingWeeks, references: weekly };
  }
  if (duration <= DAY_MS) {
    const daily = build('days', 1);
    if (hasClockChange(daily)) return { status: 'unassessable', reason: 'clock-change' };
    if (reaches(daily)) return { status: 'ready', mode: 'daily', spacing: 1, references: daily };
  }

  return { status: 'unassessable', reason: 'insufficient-history' };
};
