/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexPattern, TimeRange } from 'src/plugins/data/public';
import fc from 'fast-check';

fc.configureGlobal({
  numRuns: 1000,
});

import { getRelativeTime, getTime } from './get_time';

const option = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined });

function arbitraryDataView(name?: string): fc.Arbitrary<IndexPattern> {
  return fc.record({
    id: fc.string({ minLength: 1 }),
    title: fc.string(),
    fieldFormatMap: fc.object(),
    allowNoIndex: fc.boolean(),
    fields: fc.array(fc.record({ name: name ? fc.constant(name) : fc.string() }), {
      minLength: name ? 1 : undefined,
    }),
  }) as unknown as fc.Arbitrary<IndexPattern>;
}

function arbitraryRelativeTime(): fc.Arbitrary<string> {
  return fc
    .nat({ max: 100 })
    .chain((n) => fc.constantFrom(`now-${n}y`, `now-${n}m`, `now-${n}d`, `now-${n}w`, `now-${n}h`));
}

const arbitraryISODateString = (): fc.Arbitrary<string> =>
  fc.date({ min: new Date(0) }).map((date) => date.toISOString());

function arbitraryTimeRange(): fc.Arbitrary<TimeRange> {
  return fc.record<TimeRange>({
    from: fc.date({ min: new Date(0) }).map((date) => date.toISOString()),
    to: fc.date({ min: new Date(0) }).map((date) => date.toISOString()),
    mode: fc.constantFrom('absolute', 'relative', undefined),
  });
}

function arbitraryMixedTimeRange(): fc.Arbitrary<TimeRange> {
  return fc.record<TimeRange>({
    from: fc.oneof(arbitraryRelativeTime(), arbitraryISODateString()),
    to: fc.oneof(arbitraryRelativeTime(), arbitraryISODateString()),
    mode: fc.constantFrom('absolute', 'relative', undefined),
  });
}

describe('Time range filters', () => {
  describe('getTime', () => {
    it('does not throw for expected inputs', () => {
      fc.assert(
        fc.property(
          arbitraryDataView(),
          arbitraryTimeRange(),
          option(fc.record({ forceNow: option(fc.date()), fieldName: option(fc.string()) })),
          (indexPattern, timeRange, options) => {
            expect(() => getTime(indexPattern, timeRange, options)).not.toThrow();
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('returns a time range filter with the provided name', () => {
      fc.assert(
        fc.property(
          arbitraryTimeRange(),
          fc
            .string({ minLength: 1 })
            .chain((name) =>
              fc.tuple(
                arbitraryDataView(name),
                fc.record({ forceNow: option(fc.date()), fieldName: fc.constant(name) })
              )
            ),
          (timeRange, [indexPattern, options]) => {
            expect(getTime(indexPattern, timeRange, options)?.query.range).toEqual({
              [options.fieldName]: {
                lte: expect.any(String),
                gte: expect.any(String),
                format: expect.any(String),
              },
            });
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('getRelativeTime', () => {
    it('does not throw for expected inputs', () => {
      fc.assert(
        fc.property(
          arbitraryDataView(),
          arbitraryMixedTimeRange(),
          option(fc.record({ forceNow: option(fc.date()), fieldName: option(fc.string()) })),
          (indexPattern, timeRange, options) => {
            expect(() => getRelativeTime(indexPattern, timeRange, options)).not.toThrow();
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('returns a time range filter with the provided name', () => {
      fc.assert(
        fc.property(
          arbitraryMixedTimeRange(),
          fc
            .string({ minLength: 1 })
            .chain((name) =>
              fc.tuple(
                arbitraryDataView(name),
                fc.record({ forceNow: option(fc.date()), fieldName: fc.constant(name) })
              )
            ),
          (timeRange, [indexPattern, options]) => {
            expect(getRelativeTime(indexPattern, timeRange, options)?.query.range).toEqual({
              [options.fieldName]: {
                lte: expect.any(String),
                gte: expect.any(String),
                format: expect.any(String),
              },
            });
          }
        ),
        { numRuns: 1000 }
      );
    });
  });
});
