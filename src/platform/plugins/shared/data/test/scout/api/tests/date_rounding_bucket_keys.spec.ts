/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import type { DateRounding, IanaTimeZone } from '@kbn/es-date-rounding';
import {
  ianaTimeZone,
  nextBucketKey,
  roundToBucketKey,
  toDateRounding,
} from '@kbn/es-date-rounding';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest } from '../fixtures';

const INDEX = `date-rounding-bucket-keys-${randomUUID()}`;
const MINUTE_MS = 6e4;
const HOUR_MS = 36e5;
const DAY_MS = 864e5;

const UNIT_SUFFIX = { minute: 'm', hour: 'h', day: 'd', week: 'w', month: 'M', year: 'y' } as const;

interface Span {
  readonly value: number;
  readonly unit: keyof typeof UNIT_SUFFIX;
}

interface BucketKeysCase {
  readonly name: string;
  readonly zone: string;
  readonly from: string;
  readonly to: string;
  /** Document spacing; it must be at most the shortest bucket any span in `spans` produces. */
  readonly stepMs: number;
  readonly spans: readonly Span[];
}

const span = (value: number, unit: Span['unit']): Span => ({ value, unit });

const SUB_DAY_SPANS: readonly Span[] = [
  span(1, 'day'),
  span(12, 'hour'),
  span(3, 'hour'),
  span(1, 'hour'),
  span(30, 'minute'),
];

const subDayCase = (name: string, zone: string, from: string, to: string): BucketKeysCase => ({
  name,
  zone,
  from,
  to,
  stepMs: 10 * MINUTE_MS,
  spans: SUB_DAY_SPANS,
});

const CASES: readonly BucketKeysCase[] = [
  subDayCase('Rome clocks go back', 'Europe/Rome', '2026-10-24T12:00:00Z', '2026-10-26T12:00:00Z'),
  subDayCase(
    'Rome clocks go forward',
    'Europe/Rome',
    '2026-03-28T12:00:00Z',
    '2026-03-30T12:00:00Z'
  ),
  subDayCase(
    'New York clocks go back',
    'America/New_York',
    '2026-10-31T12:00:00Z',
    '2026-11-02T12:00:00Z'
  ),
  subDayCase(
    'New York clocks go forward',
    'America/New_York',
    '2026-03-07T12:00:00Z',
    '2026-03-09T12:00:00Z'
  ),
  {
    name: 'Santiago skipped midnight',
    zone: 'America/Santiago',
    from: '2024-09-07T00:00:00Z',
    to: '2024-09-09T00:00:00Z',
    stepMs: 10 * MINUTE_MS,
    spans: [span(1, 'day'), span(12, 'hour')],
  },
  {
    name: 'New York ISO weeks across the clock change',
    zone: 'America/New_York',
    from: '2024-09-01T04:00:00Z',
    to: '2024-12-01T05:00:00Z',
    stepMs: HOUR_MS,
    spans: [span(1, 'week')],
  },
  {
    name: 'Rome months and month multiples',
    zone: 'Europe/Rome',
    from: '2024-01-01T00:00:00Z',
    to: '2026-01-01T00:00:00Z',
    stepMs: DAY_MS,
    spans: [span(1, 'month'), span(3, 'month'), span(5, 'month')],
  },
  {
    name: 'UTC year multiples',
    zone: 'UTC',
    from: '2014-01-01T00:00:00Z',
    to: '2027-01-01T00:00:00Z',
    stepMs: DAY_MS,
    spans: [span(2, 'year'), span(3, 'year')],
  },
];

const esqlSpan = ({ value, unit }: Span): string => `${value} ${unit}${value === 1 ? '' : 's'}`;

const toRounding = ({ value, unit }: Span): DateRounding => {
  const rounding = toDateRounding(`${value}${UNIT_SUFFIX[unit]}`);
  if (!rounding) {
    throw new Error(`Unsupported span: ${value} ${unit}`);
  }
  return rounding;
};

const docTimestamps = ({ from, to, stepMs }: BucketKeysCase): number[] => {
  const start = Date.parse(from);
  const count = Math.ceil((Date.parse(to) - start) / stepMs);
  return Array.from({ length: count }, (_, i) => start + i * stepMs);
};

const ALL_TIMESTAMPS = CASES.flatMap(docTimestamps);

/** Keys of the non-empty buckets for every indexed document in the case range, since ranges overlap. */
const expectedKeys = (
  { from, to }: BucketKeysCase,
  rounding: DateRounding,
  timeZone: IanaTimeZone
): number[] => {
  const start = Date.parse(from);
  const end = Date.parse(to);
  const keys = ALL_TIMESTAMPS.filter((timestamp) => timestamp >= start && timestamp < end).map(
    (timestamp) => roundToBucketKey(timestamp, rounding, timeZone)
  );
  return [...new Set(keys)].sort((a, b) => a - b);
};

apiTest.describe(
  'ES date rounding parity for ES|QL bucket keys',
  { tag: tags.deploymentAgnostic },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: INDEX }, { ignore: [404] });
      await esClient.indices.create({
        index: INDEX,
        mappings: { properties: { '@timestamp': { type: 'date' } } },
      });
      await esClient.bulk({
        index: INDEX,
        refresh: 'wait_for',
        operations: ALL_TIMESTAMPS.flatMap((timestamp) => [
          { index: {} },
          { '@timestamp': timestamp },
        ]),
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: INDEX }, { ignore: [404] });
    });

    for (const bucketKeysCase of CASES) {
      apiTest(
        `roundToBucketKey matches ES|QL BUCKET: ${bucketKeysCase.name}`,
        async ({ esClient }) => {
          const timeZone = ianaTimeZone(bucketKeysCase.zone);

          for (const bucketSpan of bucketKeysCase.spans) {
            const rounding = toRounding(bucketSpan);
            const response = await esClient.esql.query({
              query: `FROM "${INDEX}"
              | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
              | STATS BY bucket = BUCKET(@timestamp, ${esqlSpan(bucketSpan)})
              | SORT bucket`,
              params: [
                { _tstart: new Date(Date.parse(bucketKeysCase.from)).toISOString() },
                { _tend: new Date(Date.parse(bucketKeysCase.to)).toISOString() },
              ],
              time_zone: timeZone,
            });
            const esqlKeys = response.values.map(([bucket]) => Date.parse(String(bucket)));
            const label = `${bucketKeysCase.zone} ${esqlSpan(bucketSpan)}`;

            expect(esqlKeys, label).toStrictEqual(expectedKeys(bucketKeysCase, rounding, timeZone));
            expect(
              esqlKeys.slice(0, -1).map((key) => nextBucketKey(key, rounding, timeZone)),
              `${label} next keys`
            ).toStrictEqual(esqlKeys.slice(1));
          }
        }
      );
    }
  }
);
