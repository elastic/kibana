/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Dark Watch run-frequency catalog. Like every other watch select setting, the
// watch offers a set of `optionIds` and the user's pick is persisted as
// `scheduleId` (the `selectedId` of the shared WatchSelectSetting). The id is a
// stable option id, not the interval itself; resolving it against this catalog
// yields the scheduled-trigger interval, the same way the id resolves to copy in
// the UI. Hourly options, every N hours, N between 1 and 24, default 4.

interface DarkWatchScheduleOption {
  /** Stable option id, persisted as `scheduleId` / the select's `selectedId`. */
  id: string;
  /** Hours between sweeps; source of the trigger interval and the UI label. */
  everyHours: number;
}

const MIN_HOURS = 1;
const MAX_HOURS = 24;
const DEFAULT_HOURS = 4;

const scheduleOptionId = (hours: number): string => `every-${hours}h`;

export const DARK_WATCH_SCHEDULE_OPTIONS: readonly DarkWatchScheduleOption[] = Array.from(
  { length: MAX_HOURS - MIN_HOURS + 1 },
  (_, index): DarkWatchScheduleOption => {
    const everyHours = MIN_HOURS + index;
    return { id: scheduleOptionId(everyHours), everyHours };
  }
);

export const DARK_WATCH_DEFAULT_SCHEDULE_ID = scheduleOptionId(DEFAULT_HOURS);

export const DARK_WATCH_SCHEDULE_OPTION_IDS: readonly string[] = DARK_WATCH_SCHEDULE_OPTIONS.map(
  ({ id }) => id
);

const optionById = new Map(DARK_WATCH_SCHEDULE_OPTIONS.map((option) => [option.id, option]));

/** True when the id is one of the offered options. */
export const isDarkWatchScheduleId = (scheduleId: string): boolean => optionById.has(scheduleId);

/** Scheduled-trigger interval (e.g. `4h`) for the selected id, default on miss. */
export const darkWatchScheduleEvery = (scheduleId: string): string => {
  const everyHours = optionById.get(scheduleId)?.everyHours ?? DEFAULT_HOURS;
  return `${everyHours}h`;
};
