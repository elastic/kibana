/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import seedrandom from 'seedrandom';
import moment from 'moment-timezone';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const START_TIME_MS = Date.parse('2026-02-02T00:00:00Z');

export const SEASONAL_REFERENCE_CONFIG = {
  referenceCycles: 3,
  evaluationCycles: 1,
  statistic: 'mean-of-three-corresponding-window-counts',
  percentageFloorExclusive: 20,
  injectedPercentage: 30,
  scope: 'known synthetic windows only; no CHANGE_POINT or Discover integration',
} as const;

interface CaseDefinition {
  name: string;
  cycleDays: 1 | 7;
  noise?: boolean;
  phaseShiftHours?: number;
  cycles?: number;
  intervalMs?: number;
  startTimeMs?: number;
  timeZone?: string;
}

interface Window {
  start: number;
  end: number;
}

interface ReferenceMeasurement {
  status: 'assessed' | 'unassessable';
  reason?: string;
  referenceWindows: Window[];
  referenceTotals: number[];
  estimatedExpectedTotal: number | null;
  percentageChange: number | null;
  exceedsPercentageFloor: boolean | null;
}

interface SeasonalReferenceRecord extends ReferenceMeasurement {
  type: 'seasonal-reference';
  seed: number;
  scenario: string;
  cycleDays: number;
  timeZone: string;
  startTime: string;
  endTime: string;
  intervalMs: number;
  counts: number[];
  evaluationWindow: Window;
  evaluationTimeRange: { from: string; to: string };
  injectedPercentage: number;
  expectedTotal: number;
  observedTotal: number;
  expectedTotalError: number | null;
  percentagePointError: number | null;
  falseThresholdCrossing: boolean | null;
  missedThresholdCrossing: boolean | null;
}

export type SeasonalReferenceInput = Pick<
  SeasonalReferenceRecord,
  'counts' | 'cycleDays' | 'intervalMs' | 'startTime' | 'timeZone'
>;

type SeasonalResidualSeries =
  | { status: 'unassessable'; reason: string }
  | {
      status: 'assessed';
      startBucket: number;
      counts: number[];
      expectedCounts: number[];
    };

const sumWindow = (counts: readonly number[], { start, end }: Window): number =>
  counts.slice(start, end).reduce((sum, count) => sum + count, 0);

const measureReference = (
  counts: readonly number[],
  window: Window,
  periodBuckets: number,
  crossesOffsetChange: boolean
): ReferenceMeasurement => {
  const unavailable = (reason: string): ReferenceMeasurement => ({
    status: 'unassessable',
    reason,
    referenceWindows: [],
    referenceTotals: [],
    estimatedExpectedTotal: null,
    percentageChange: null,
    exceedsPercentageFloor: null,
  });
  if (
    !Number.isInteger(window.start) ||
    !Number.isInteger(window.end) ||
    window.start < 0 ||
    window.end > counts.length ||
    window.end <= window.start
  ) {
    return unavailable('invalid-or-empty-window');
  }
  if (crossesOffsetChange) return unavailable('daylight-saving-transition-not-supported');
  if (!Number.isInteger(periodBuckets)) return unavailable('buckets-not-aligned-to-cycle');
  if (window.end - window.start > periodBuckets) {
    return unavailable('reference-windows-would-overlap');
  }
  const referenceWindows = Array.from(
    { length: SEASONAL_REFERENCE_CONFIG.referenceCycles },
    (_, index) => ({
      start: window.start - (index + 1) * periodBuckets,
      end: window.end - (index + 1) * periodBuckets,
    })
  );
  if (referenceWindows.some(({ start }) => start < 0)) {
    return unavailable('fewer-than-three-preceding-cycles');
  }
  const referenceTotals = referenceWindows.map((reference) => sumWindow(counts, reference));
  const estimatedExpectedTotal =
    referenceTotals.reduce((sum, count) => sum + count, 0) / referenceTotals.length;
  if (estimatedExpectedTotal === 0) return unavailable('zero-reference-no-percentage');
  const percentageChange =
    ((sumWindow(counts, window) - estimatedExpectedTotal) / estimatedExpectedTotal) * 100;
  return {
    status: 'assessed',
    referenceWindows,
    referenceTotals,
    estimatedExpectedTotal,
    percentageChange,
    exceedsPercentageFloor: percentageChange > SEASONAL_REFERENCE_CONFIG.percentageFloorExclusive,
  };
};

const getReferenceContext = ({
  counts,
  cycleDays,
  intervalMs,
  startTime,
  timeZone,
}: SeasonalReferenceInput) => {
  const startTimeMs = Date.parse(startTime);
  const offsets = new Set(
    Array.from({ length: counts.length + 1 }, (_, bucket) =>
      moment.tz(startTimeMs + bucket * intervalMs, timeZone).utcOffset()
    )
  );
  return { periodBuckets: (cycleDays * DAY_MS) / intervalMs, crossesOffsetChange: offsets.size > 1 };
};

/** Measures a known cycle on an arbitrary window without using the injected-window labels. */
export const measureSeasonalReference = (
  input: SeasonalReferenceInput,
  window: Window
): ReferenceMeasurement => {
  const { periodBuckets, crossesOffsetChange } = getReferenceContext(input);
  return measureReference(input.counts, window, periodBuckets, crossesOffsetChange);
};

/** Builds observed-minus-expected counts only where three preceding cycles are available. */
export const createSeasonalResidualSeries = (input: SeasonalReferenceInput): SeasonalResidualSeries => {
  const { counts } = input;
  const { periodBuckets, crossesOffsetChange } = getReferenceContext(input);
  const lastWindow = { start: counts.length - 1, end: counts.length };
  const lastReference = measureReference(counts, lastWindow, periodBuckets, crossesOffsetChange);
  if (lastReference.status === 'unassessable') {
    return { status: 'unassessable', reason: lastReference.reason ?? 'seasonal-reference-unavailable' };
  }

  const startBucket = SEASONAL_REFERENCE_CONFIG.referenceCycles * periodBuckets;
  const expectedCounts: number[] = [];
  const residuals: number[] = [];
  for (let bucket = startBucket; bucket < counts.length; bucket++) {
    const reference = measureReference(
      counts,
      { start: bucket, end: bucket + 1 },
      periodBuckets,
      crossesOffsetChange
    );
    if (reference.estimatedExpectedTotal === null) {
      return { status: 'unassessable', reason: reference.reason ?? 'seasonal-reference-unavailable' };
    }
    expectedCounts.push(reference.estimatedExpectedTotal);
    residuals.push(counts[bucket] - reference.estimatedExpectedTotal);
  }
  return { status: 'assessed', startBucket, counts: residuals, expectedCounts };
};

const CASES: readonly CaseDefinition[] = [
  { name: 'daily', cycleDays: 1 },
  { name: 'daily-noisy', cycleDays: 1, noise: true },
  { name: 'daily-phase-shift', cycleDays: 1, phaseShiftHours: -3 },
  { name: 'weekly-weekday-weekend', cycleDays: 7 },
  { name: 'weekly-noisy', cycleDays: 7, noise: true },
  { name: 'weekly-phase-shift', cycleDays: 7, phaseShiftHours: 24 },
  { name: 'daily-insufficient-history', cycleDays: 1, cycles: 3 },
  { name: 'weekly-insufficient-history', cycleDays: 7, cycles: 3 },
  { name: 'daily-misaligned-buckets', cycleDays: 1, intervalMs: 3.5 * HOUR_MS },
  {
    name: 'daily-dst-transition',
    cycleDays: 1,
    startTimeMs: Date.parse('2026-03-27T00:00:00+01:00'),
    timeZone: 'Europe/Madrid',
  },
];

/** Compares paired seasonal references on known windows without running a detector or contacting ES. */
export const createSeasonalReferenceReport = (seed: number): SeasonalReferenceRecord[] =>
  CASES.flatMap((definition) => {
    const {
      name,
      cycleDays,
      cycles = SEASONAL_REFERENCE_CONFIG.referenceCycles +
        SEASONAL_REFERENCE_CONFIG.evaluationCycles,
      intervalMs = HOUR_MS,
      startTimeMs = START_TIME_MS,
      timeZone = 'UTC',
      phaseShiftHours = 0,
      noise = false,
    } = definition;
    const random = seedrandom(`${seed}:${name}`);
    const cycleMs = cycleDays * DAY_MS;
    const length = Math.floor((cycles * cycleMs) / intervalMs);
    const evaluationStartMs = (cycles - 1) * cycleMs;
    const evaluationStart = Math.ceil(evaluationStartMs / intervalMs);
    const windowStartHours = cycleDays === 1 ? 8 : 4 * 24 + 8;
    const windowDurationHours = cycleDays === 1 ? 4 : 28;
    // Convert offsets once; repeated division can round a non-empty misaligned window to zero.
    const evaluationWindow = {
      start: Math.ceil((evaluationStartMs + windowStartHours * HOUR_MS) / intervalMs),
      end: Math.floor(
        (evaluationStartMs + (windowStartHours + windowDurationHours) * HOUR_MS) / intervalMs
      ),
    };
    const expectedCounts = Array.from({ length }, (_, bucket) => {
      const hours =
        (bucket * intervalMs) / HOUR_MS + (bucket >= evaluationStart ? phaseShiftHours : 0);
      const hourOfDay = hours % 24;
      const dayOfWeek = Math.floor(hours / 24) % 7;
      const weekdayFactor = cycleDays === 7 && dayOfWeek >= 5 ? 0.3 : 1;
      return (hourOfDay >= 8 && hourOfDay < 18 ? 300 : 100) * weekdayFactor;
    });
    // Both variants share the identical noisy population; only the known evaluation window changes.
    const controlCounts = expectedCounts.map((count) =>
      Math.max(0, count + (noise ? 10 * Math.round((random() * 2 - 1) * 2) : 0))
    );
    const endTimeMs = startTimeMs + length * intervalMs;
    const startTime = new Date(startTimeMs).toISOString();
    return [0, SEASONAL_REFERENCE_CONFIG.injectedPercentage].map((injectedPercentage) => {
      const counts = controlCounts.map((count, bucket) =>
        bucket >= evaluationWindow.start && bucket < evaluationWindow.end
          ? Math.round((count * (100 + injectedPercentage)) / 100)
          : count
      );
      const measurement = measureSeasonalReference(
        { counts, cycleDays, intervalMs, startTime, timeZone },
        evaluationWindow
      );
      const expectedTotal = sumWindow(expectedCounts, evaluationWindow);
      const exceedsFloor = measurement.exceedsPercentageFloor;
      return {
        type: 'seasonal-reference' as const,
        seed,
        scenario: name,
        cycleDays,
        timeZone,
        startTime,
        endTime: new Date(endTimeMs).toISOString(),
        intervalMs,
        counts,
        evaluationWindow,
        evaluationTimeRange: {
          from: new Date(startTimeMs + evaluationWindow.start * intervalMs).toISOString(),
          to: new Date(startTimeMs + evaluationWindow.end * intervalMs).toISOString(),
        },
        injectedPercentage,
        expectedTotal,
        observedTotal: sumWindow(counts, evaluationWindow),
        ...measurement,
        expectedTotalError:
          measurement.estimatedExpectedTotal === null
            ? null
            : measurement.estimatedExpectedTotal - expectedTotal,
        percentagePointError:
          measurement.percentageChange === null
            ? null
            : measurement.percentageChange - injectedPercentage,
        falseThresholdCrossing:
          exceedsFloor === null ? null : injectedPercentage === 0 && exceedsFloor,
        missedThresholdCrossing:
          exceedsFloor === null
            ? null
            : injectedPercentage > SEASONAL_REFERENCE_CONFIG.percentageFloorExclusive && !exceedsFloor,
      };
    });
  });
