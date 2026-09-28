/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActivityBucket } from '../activity_increase';
import {
  createDailyReferenceLookup,
  detectExploratoryActivityInterval,
  planExploratoryHistory,
} from './exploratory_interval';
import { planActivityHistory } from './history_plan';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const start = Date.parse('2026-09-24T00:00:00Z');
const buckets = (counts: readonly number[], from = start): ActivityBucket[] =>
  counts.map((count, index) => ({
    startTimeMs: from + index * HOUR,
    endTimeMs: from + (index + 1) * HOUR,
    count,
  }));
const current = Array.from({ length: 72 }, (_, index) =>
  index >= 36 && index < 40 ? 30 : 10
);
const historyWindow = { fromMs: start - DAY, toMs: start };
const makeLookup = (values = current, withHistory = true) =>
  createDailyReferenceLookup({
    buckets: buckets(values),
    historyWindow: withHistory ? historyWindow : undefined,
    earliestMs: start - (withHistory ? DAY : 0),
    timeZone: 'UTC',
  });

describe('exploratory daily comparison', () => {
  it('reads one extra day for a three-day view, not six three-day references', () => {
    expect(
      planExploratoryHistory({
        view: { fromMs: start, toMs: start + 3 * DAY },
        earliestMs: start - 5 * DAY,
        intervalMs: HOUR,
        timeZone: 'UTC',
      })
    ).toEqual(historyWindow);
  });

  it('clips history to the first complete bucket after the source boundary', () => {
    expect(
      planExploratoryHistory({
        view: { fromMs: start, toMs: start + 3 * DAY },
        earliestMs: start - DAY + 6.5 * HOUR,
        intervalMs: HOUR,
        timeZone: 'UTC',
      })
    ).toEqual({ fromMs: start - DAY + 7 * HOUR, toMs: start });
  });

  it('does not request thirty weeks for a thirty-day view', () => {
    expect(
      planActivityHistory({
        view: { fromMs: start, toMs: start + 30 * DAY },
        earliestMs: start - 365 * DAY,
        timeZone: 'UTC',
      })
    ).toEqual({ status: 'unassessable', reason: 'insufficient-history' });
  });

  it('keeps the complete weekly B plan when it is available within six weeks', () => {
    const plan = planActivityHistory({
      view: { fromMs: start, toMs: start + DAY },
      earliestMs: start - 42 * DAY,
      timeZone: 'UTC',
    });
    expect(plan.status).toBe('ready');
    if (plan.status !== 'ready') throw new Error('Expected the complete B plan');
    expect(plan.mode).toBe('weekly');
    expect(plan.references).toHaveLength(6);
    expect(plan.references[5].fromMs).toBe(start - 42 * DAY);
  });

  it('reuses the preceding day inside the view', () => {
    expect(makeLookup()(36, 40)).toEqual({
      fromMs: start + 12 * HOUR,
      toMs: start + 16 * HOUR,
      start: 36,
      end: 40,
      daysAgo: 1,
    });
  });

  it('never compares a multi-day candidate with overlapping observations', () => {
    expect(makeLookup()(0, 30)).toBeNull();
    const reference = makeLookup()(30, 60);
    expect(reference?.daysAgo).toBe(2);
    expect(reference?.toMs).toBeLessThanOrEqual(start + 30 * HOUR);
  });

  it('can analyze later days even when the start of the view lacks history', () => {
    const lookup = makeLookup(current, false);
    expect(lookup(8, 10)).toBeNull();
    expect(lookup(36, 40)?.daysAgo).toBe(1);
    expect(detectExploratoryActivityInterval({ current, history: [], lookup }).status).toBe(
      'admitted'
    );
  });

  it('admits a measured increase without inventing a p-value', () => {
    const result = detectExploratoryActivityInterval({
      current,
      history: new Array<number>(24).fill(10),
      lookup: makeLookup(),
    });
    expect(result.status).toBe('admitted');
    expect(result).not.toHaveProperty('p');
    expect(result).not.toHaveProperty('pvalue');
    if (result.status !== 'admitted') throw new Error('Expected an exploratory increase');
    expect(result.candidate.observed).toBeGreaterThan(result.historicalTotal);
    expect(result.comparison.toMs).toBeLessThanOrEqual(start + result.candidate.start * HOUR);
  });

  it('does not admit a daily rise identical to its earlier comparison', () => {
    const daily = Array.from({ length: 24 }, (_, index) =>
      index >= 10 && index < 16 ? 30 : 10
    );
    const repeated = [...daily, ...daily, ...daily];
    expect(
      detectExploratoryActivityInterval({
        current: repeated,
        history: daily,
        lookup: makeLookup(repeated),
      }).status
    ).toBe('none');
  });

  it('accepts decimal sums, but rejects negative or incomplete values', () => {
    expect(
      detectExploratoryActivityInterval({
        current: current.map((value) => value / 4),
        history: new Array<number>(24).fill(2.5),
        lookup: makeLookup(),
        kind: 'sums',
      }).status
    ).toBe('admitted');
    expect(() =>
      detectExploratoryActivityInterval({
        current: [-1, ...current.slice(1)],
        history: [],
        lookup: makeLookup(),
      })
    ).toThrow('Expected complete nonnegative exploratory series');
  });

  it('rejects a daily comparison whose elapsed duration changed at DST', () => {
    const afterChange = Date.parse('2026-10-26T00:00:00+01:00');
    const beforeChange = Date.parse('2026-10-25T00:00:00+02:00');
    const lookup = createDailyReferenceLookup({
      buckets: buckets(new Array<number>(24).fill(10), afterChange),
      historyWindow: { fromMs: beforeChange, toMs: afterChange },
      earliestMs: beforeChange,
      timeZone: 'Europe/Madrid',
    });
    expect(lookup(0, 8)).toBeNull();
  });
});
