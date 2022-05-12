/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { processBucket } from './process_bucket';

import type { Panel, Series } from '../../../../common/types';
import { createFieldsFetcher } from '../../search_strategies/lib/fields_fetcher';

function createValueObject(key: string | number, value: string | number, seriesId: string) {
  return { key_as_string: `${key}`, doc_count: value, key, [seriesId]: { value } };
}

function createBucketsObjects(size: number, sort: string, seriesId: string) {
  const values = Array(size)
    .fill(1)
    .map((_, i) => i + 1);
  if (sort === 'flat') {
    return values.map((_, i) => createValueObject(i, 1, seriesId));
  }
  if (sort === 'desc') {
    return values.reverse().map((v, i) => createValueObject(i, v, seriesId));
  }
  return values.map((v, i) => createValueObject(i, v, seriesId));
}

function createPanel(series: string[]) {
  return {
    type: 'table',
    time_field: '',
    series: series.map((seriesId) => ({
      id: seriesId,
      metrics: [{ id: seriesId, type: 'count' }],
      trend_arrows: 1,
    })) as unknown as Series[],
  } as Panel;
}

function createBuckets(series: string[]) {
  return [
    { key: 'A', trend: 'asc', size: 10 },
    { key: 'B', trend: 'desc', size: 10 },
    { key: 'C', trend: 'flat', size: 10 },
    { key: 'D', trend: 'asc', size: 1, expectedTrend: 'flat' },
  ].map(({ key, trend, size, expectedTrend }) => {
    const baseObj: {
      expectedTrend: string;
      key: string;
      [series: string]: any;
    } = {
      key,
      expectedTrend: expectedTrend || trend,
    };

    for (const seriesId of series) {
      baseObj[seriesId] = {
        meta: {
          timeField: 'timestamp',
          seriesId,
        },
        timeseries: {
          buckets: createBucketsObjects(size, trend, seriesId),
        },
      };
    }
    return baseObj;
  });
}

function trendChecker(trend: string, slope: number) {
  switch (trend) {
    case 'asc':
      return slope > 0;
    case 'desc':
      return slope <= 0;
    case 'flat':
      return slope === 0;
    default:
      throw Error(`Slope value ${slope} not valid for trend "${trend}"`);
  }
}

describe('processBucket(panel)', () => {
  const extractFields = jest.fn() as ReturnType<typeof createFieldsFetcher>;
  let panel: Panel;

  describe('single metric panel', () => {
    const SERIES_ID = 'series-id';

    beforeEach(() => {
      panel = createPanel([SERIES_ID]);
    });

    test('return the correct trend direction', async () => {
      const bucketProcessor = processBucket({ panel, extractFields });
      const buckets = createBuckets([SERIES_ID]);
      for (const bucket of buckets) {
        const result = await bucketProcessor(bucket);
        expect(result.key).toEqual(bucket.key);
        expect(trendChecker(bucket.expectedTrend, result.series[0]!.slope!)).toBeTruthy();
      }
    });

    test('properly handle 0 values for trend', async () => {
      const bucketProcessor = processBucket({ panel, extractFields });
      const bucketforNaNResult = {
        key: 'NaNScenario',
        expectedTrend: 'flat',
        [SERIES_ID]: {
          meta: {
            timeField: 'timestamp',
            seriesId: SERIES_ID,
          },
          timeseries: {
            buckets: [
              // this is a flat case, but 0/0 has not a valid number result
              createValueObject(0, 0, SERIES_ID),
              createValueObject(1, 0, SERIES_ID),
            ],
          },
        },
      };
      const result = await bucketProcessor(bucketforNaNResult);
      expect(result.key).toEqual(bucketforNaNResult.key);
      expect(trendChecker(bucketforNaNResult.expectedTrend, result.series[0]!.slope!)).toEqual(
        true
      );
    });

    test('have the side effect to create the timeseries property if missing on bucket', async () => {
      const bucketProcessor = processBucket({ panel, extractFields });
      const buckets = createBuckets([SERIES_ID]);

      for (const bucket of buckets) {
        await bucketProcessor(bucket);

        expect(bucket[SERIES_ID].buckets).toBeUndefined();
        expect(bucket[SERIES_ID].timeseries).toBeDefined();
      }
    });
  });

  describe('multiple metrics panel', () => {
    const SERIES = ['series-id-1', 'series-id-2'];

    beforeEach(() => {
      panel = createPanel(SERIES);
    });

    test('return the correct trend direction', async () => {
      const bucketProcessor = processBucket({ panel, extractFields });
      const buckets = createBuckets(SERIES);

      for (const bucket of buckets) {
        const result = await bucketProcessor(bucket);

        expect(result.key).toEqual(bucket.key);
        expect(trendChecker(bucket.expectedTrend, result.series[0]!.slope!)).toBeTruthy();
        expect(trendChecker(bucket.expectedTrend, result.series[1]!.slope!)).toBeTruthy();
      }
    });
  });
});
