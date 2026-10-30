/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { DateInterval, ZonedDateRange } from '@kbn/es-date-rounding';
import { fitsInBuckets, ianaTimeZone, pickDateRounding } from '@kbn/es-date-rounding';
import type { EsClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';

const INDEX = 'date-rounding-parity';
const MINUTE_MS = 6e4;
const HOUR_MS = 36e5;

const fixed = (expression: string, nominalMs: number): DateInterval => ({
  expression,
  kind: 'fixed',
  nominalMs,
});

const calendar = (expression: string, nominalMs: number): DateInterval => ({
  expression,
  kind: 'calendar',
  nominalMs,
});

// Picker ladder steps plus manual intervals that do not divide an hour or a day.
const SUB_DAY_INTERVALS: readonly DateInterval[] = [
  calendar('1d', 24 * HOUR_MS),
  fixed('12h', 12 * HOUR_MS),
  fixed('3h', 3 * HOUR_MS),
  fixed('2h', 2 * HOUR_MS),
  fixed('1h', HOUR_MS),
  fixed('45m', 45 * MINUTE_MS),
  fixed('30m', 30 * MINUTE_MS),
  fixed('20m', 20 * MINUTE_MS),
  fixed('10m', 10 * MINUTE_MS),
];

const CALENDAR_INTERVALS: readonly DateInterval[] = [
  calendar('1M', 30 * 24 * HOUR_MS),
  calendar('1w', 7 * 24 * HOUR_MS),
  calendar('1d', 24 * HOUR_MS),
  fixed('12h', 12 * HOUR_MS),
  fixed('3h', 3 * HOUR_MS),
];

interface ParityCase {
  readonly name: string;
  readonly zone: string;
  readonly from: string;
  readonly to: string;
  readonly maxBuckets: number;
  /** Document spacing; it must be at most the shortest bucket any interval in `intervals` produces. */
  readonly stepMs: number;
  readonly intervals: readonly DateInterval[];
}

const subDayCase = (
  name: string,
  zone: string,
  from: string,
  to: string,
  maxBuckets: number
): ParityCase => ({
  name,
  zone,
  from,
  to,
  maxBuckets,
  stepMs: MINUTE_MS,
  intervals: SUB_DAY_INTERVALS,
});

const CASES: readonly ParityCase[] = [
  subDayCase('UTC day', 'UTC', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 30),
  subDayCase(
    'Kolkata half-hour offset',
    'Asia/Kolkata',
    '2024-01-02T00:00:00Z',
    '2024-01-03T00:00:00Z',
    24
  ),
  subDayCase(
    'New York forward jump',
    'America/New_York',
    '2024-03-09T12:00:00Z',
    '2024-03-11T00:00:00Z',
    12
  ),
  subDayCase(
    'New York backward jump',
    'America/New_York',
    '2024-11-02T12:00:00Z',
    '2024-11-04T00:00:00Z',
    12
  ),
  subDayCase(
    'Lord Howe 30m forward jump',
    'Australia/Lord_Howe',
    '2024-10-05T13:30:00Z',
    '2024-10-09T18:00:00Z',
    100
  ),
  subDayCase(
    'Lord Howe 30m backward jump',
    'Australia/Lord_Howe',
    '2024-04-06T10:00:00Z',
    '2024-04-07T10:00:00Z',
    24
  ),
  subDayCase(
    'Chatham forward jump at :45',
    'Pacific/Chatham',
    '2024-09-28T00:00:00Z',
    '2024-09-29T00:00:00Z',
    24
  ),
  subDayCase(
    'Beirut midnight forward jump',
    'Asia/Beirut',
    '2024-03-30T00:00:00Z',
    '2024-03-31T12:00:00Z',
    12
  ),
  subDayCase(
    'Santiago midnight forward jump',
    'America/Santiago',
    '2024-09-07T00:00:00Z',
    '2024-09-09T00:00:00Z',
    12
  ),
  subDayCase(
    'Kathmandu 15m forward jump',
    'Asia/Kathmandu',
    '1985-12-31T00:00:00Z',
    '1986-01-01T12:00:00Z',
    36
  ),
  subDayCase(
    'Guyana 45m forward jump',
    'America/Guyana',
    '1975-07-31T12:00:00Z',
    '1975-08-01T12:00:00Z',
    24
  ),
  {
    name: 'New York weeks across the backward jump',
    zone: 'America/New_York',
    from: '2024-09-01T04:00:00Z',
    to: '2024-12-01T05:00:00Z',
    maxBuckets: 15,
    stepMs: HOUR_MS,
    intervals: CALENDAR_INTERVALS,
  },
  {
    name: 'Havana weeks across a skipped and a repeated midnight',
    zone: 'America/Havana',
    from: '2024-03-01T05:00:00Z',
    to: '2024-12-01T05:00:00Z',
    maxBuckets: 40,
    stepMs: HOUR_MS,
    intervals: CALENDAR_INTERVALS,
  },
  {
    name: 'Santiago months across midnight jumps',
    zone: 'America/Santiago',
    from: '2024-01-01T03:00:00Z',
    to: '2025-01-01T03:00:00Z',
    maxBuckets: 20,
    stepMs: HOUR_MS,
    intervals: CALENDAR_INTERVALS,
  },
];

const toRange = ({ zone, from, to }: ParityCase): ZonedDateRange => ({
  from: Date.parse(from),
  to: Date.parse(to),
  timeZone: ianaTimeZone(zone),
});

const histogramParams = (
  interval: DateInterval
): Pick<estypes.AggregationsDateHistogramAggregation, 'calendar_interval' | 'fixed_interval'> =>
  interval.kind === 'calendar'
    ? { calendar_interval: interval.expression as estypes.AggregationsCalendarInterval }
    : { fixed_interval: interval.expression };

/** Non-empty `date_histogram` bucket keys per interval for the documents in `range`. */
const dateHistogramKeys = async (
  esClient: EsClient,
  range: ZonedDateRange,
  intervals: readonly DateInterval[]
): Promise<Map<string, number[]>> => {
  const response = await esClient.search<
    unknown,
    Record<string, estypes.AggregationsDateHistogramAggregate>
  >({
    index: INDEX,
    size: 0,
    query: {
      range: { '@timestamp': { gte: range.from, lt: range.to, format: 'epoch_millis' } },
    },
    aggs: Object.fromEntries(
      intervals.map((interval) => [
        interval.expression,
        {
          date_histogram: {
            field: '@timestamp',
            time_zone: range.timeZone,
            min_doc_count: 1,
            ...histogramParams(interval),
          },
        },
      ])
    ),
  });
  return new Map(
    intervals.map(({ expression }) => {
      const buckets = response.aggregations?.[expression]?.buckets;
      return [expression, Array.isArray(buckets) ? buckets.map(({ key }) => key) : []];
    })
  );
};

apiTest.describe(
  'ES date rounding parity for auto date histograms',
  { tag: tags.deploymentAgnostic },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: INDEX }, { ignore: [404] });
      await esClient.indices.create({
        index: INDEX,
        mappings: { properties: { '@timestamp': { type: 'date' } } },
      });
      const timestamps = CASES.flatMap((parityCase) => {
        const { from, to } = toRange(parityCase);
        const { stepMs } = parityCase;
        return Array.from({ length: Math.ceil((to - from) / stepMs) }, (_, i) => from + i * stepMs);
      });
      await esClient.bulk({
        index: INDEX,
        refresh: 'wait_for',
        operations: timestamps.flatMap((timestamp) => [{ index: {} }, { '@timestamp': timestamp }]),
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: INDEX }, { ignore: [404] });
    });

    for (const parityCase of CASES) {
      apiTest(
        `fitsInBuckets matches date_histogram bucket counts: ${parityCase.name}`,
        async ({ esClient }) => {
          const range = toRange(parityCase);
          const keysByInterval = await dateHistogramKeys(esClient, range, parityCase.intervals);
          for (const interval of parityCase.intervals) {
            const esBuckets = keysByInterval.get(interval.expression)?.length ?? 0;
            expect(esBuckets, `${interval.expression} returned no ES buckets`).toBeGreaterThan(0);
            expect(
              {
                fits: fitsInBuckets(interval, range, esBuckets),
                fitsOneLess: esBuckets > 1 && fitsInBuckets(interval, range, esBuckets - 1),
              },
              `${parityCase.zone} ${interval.expression} has ${esBuckets} ES buckets`
            ).toStrictEqual({ fits: true, fitsOneLess: false });
          }
        }
      );

      apiTest(`pickDateRounding matches ES|QL BUCKET: ${parityCase.name}`, async ({ esClient }) => {
        const range = toRange(parityCase);
        const { maxBuckets } = parityCase;
        const picked = pickDateRounding(maxBuckets, range);
        const [dslKeys, esqlResponse] = await Promise.all([
          dateHistogramKeys(esClient, range, [picked]),
          esClient.esql.query({
            query: `FROM ${INDEX}
              | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
              | STATS BY bucket = BUCKET(@timestamp, ${maxBuckets}, ?_tstart, ?_tend)
              | SORT bucket`,
            params: [
              { _tstart: new Date(range.from).toISOString() },
              { _tend: new Date(range.to).toISOString() },
            ],
            time_zone: range.timeZone,
          }),
        ]);
        const esqlKeys = esqlResponse.values.map(([bucket]) => Date.parse(String(bucket)));
        expect(esqlKeys.length).toBeLessThanOrEqual(maxBuckets);
        expect(dslKeys.get(picked.expression), `picked ${picked.expression}`).toStrictEqual(
          esqlKeys
        );
      });
    }
  }
);
