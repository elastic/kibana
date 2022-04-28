/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TabifyBuckets } from './buckets';
import { AggGroupNames, IAggConfig } from '../aggs';
import moment from 'moment';

interface Bucket {
  key: number | string;
}

describe('Buckets wrapper', () => {
  const check = (aggResp: any, count: number, keys: string[]) => {
    test('reads the length', () => {
      const buckets = new TabifyBuckets(aggResp);
      expect(buckets).toHaveLength(count);
    });

    test('iterates properly, passing in the key', () => {
      const buckets = new TabifyBuckets(aggResp);
      const keysSent: any[] = [];

      buckets.forEach((bucket, key) => {
        if (key) {
          keysSent.push(key);
        }
      });

      expect(keysSent).toHaveLength(count);
      expect(keysSent).toEqual(keys);
    });
  };

  describe('with object style buckets', () => {
    let aggResp: any = {
      [AggGroupNames.Buckets]: {
        '0-100': {},
        '100-200': {},
        '200-300': {},
      },
    };

    const count = 3;
    const keys = ['0-100', '100-200', '200-300'];

    check(aggResp, count, keys);

    test('should accept filters agg queries with strings', () => {
      aggResp = {
        [AggGroupNames.Buckets]: {
          'response:200': {},
          'response:404': {},
        },
      };

      const agg = {
        params: {
          filters: [
            {
              label: '',
              input: { query: 'response:200' },
            },
            {
              label: '',
              input: { query: 'response:404' },
            },
          ],
        },
      } as IAggConfig;

      const buckets = new TabifyBuckets(aggResp, agg);

      expect(buckets).toHaveLength(2);

      buckets._keys.forEach((key) => {
        expect(typeof key).toBe('string');
      });
    });

    test('should accept filters agg queries with query_string queries', () => {
      aggResp = {
        [AggGroupNames.Buckets]: {
          'response:200': {},
          'response:404': {},
        },
      };

      const agg = {
        params: {
          filters: [
            {
              label: '',
              input: { query: { query_string: { query: 'response:200' } } },
            },
            {
              label: '',
              input: { query: { query_string: { query: 'response:404' } } },
            },
          ],
        },
      } as IAggConfig;

      const buckets = new TabifyBuckets(aggResp, agg);

      expect(buckets).toHaveLength(2);

      buckets._keys.forEach((key) => {
        expect(typeof key).toBe('string');
      });
    });

    test('should accept filters agg queries with query dsl queries', () => {
      aggResp = {
        [AggGroupNames.Buckets]: {
          '{match_all: {}}': {},
        },
      };

      const agg = {
        params: {
          filters: [
            {
              label: '',
              input: { query: { match_all: {} } },
            },
          ],
        },
      } as IAggConfig;

      const buckets = new TabifyBuckets(aggResp, agg);

      expect(buckets).toHaveLength(1);

      buckets._keys.forEach((key) => {
        expect(typeof key).toBe('string');
      });
    });
  });

  describe('with array style buckets', () => {
    const aggResp = {
      [AggGroupNames.Buckets]: [
        { key: '0-100', value: {} },
        { key: '100-200', value: {} },
        { key: '200-300', value: {} },
      ],
    };

    const count = 3;
    const keys = ['0-100', '100-200', '200-300'];

    check(aggResp, count, keys);
  });

  describe('with single bucket aggregations (filter)', () => {
    test('creates single bucket from agg content', () => {
      const aggResp = {
        single_bucket: {},
        doc_count: 5,
      };
      const buckets = new TabifyBuckets(aggResp);

      expect(buckets).toHaveLength(1);
    });
  });

  describe('drop_partial option', () => {
    const aggResp = {
      [AggGroupNames.Buckets]: [
        { key: 0, value: {} },
        { key: 100, value: {} },
        { key: 200, value: {} },
        { key: 300, value: {} },
      ],
    };

    test('drops partial buckets when enabled', () => {
      const agg = {
        params: {
          drop_partials: true,
          field: {
            name: 'date',
          },
        },
      } as IAggConfig;
      const timeRange = {
        from: moment(150),
        to: moment(350),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(aggResp, agg, timeRange);

      expect(buckets).toHaveLength(1);
    });

    test('drops partial buckets with missing buckets based on used_interval if provided', () => {
      const agg = {
        params: {
          drop_partials: true,
          used_interval: 'auto',
          field: {
            name: 'date',
          },
        },
        // interval is 100ms, but the data has holes
        serialize: () => ({
          params: { used_interval: '100ms' },
        }),
      } as unknown as IAggConfig;
      const timeRange = {
        from: moment(1050),
        to: moment(1700),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(
        {
          [AggGroupNames.Buckets]: [
            { key: 0, value: {} },
            { key: 1000, value: {} },
            { key: 1100, value: {} },
            { key: 1400, value: {} },
            { key: 1500, value: {} },
            { key: 1700, value: {} },
            { key: 3000, value: {} },
          ],
        },
        agg,
        timeRange
      );

      // 1100, 1400 and 1500
      expect(buckets).toHaveLength(3);
    });

    test('keeps partial buckets when disabled', () => {
      const agg = {
        params: {
          drop_partials: false,
          field: {
            name: 'date',
          },
        },
      } as IAggConfig;
      const timeRange = {
        from: moment(150),
        to: moment(350),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(aggResp, agg, timeRange);

      expect(buckets).toHaveLength(4);
    });

    test('keeps aligned buckets when enabled', () => {
      const agg = {
        params: {
          drop_partials: true,
          field: {
            name: 'date',
          },
        },
      } as IAggConfig;
      const timeRange = {
        from: moment(100),
        to: moment(400),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(aggResp, agg, timeRange);

      expect(buckets).toHaveLength(3);
    });

    test('does not drop buckets for non-timerange fields', () => {
      const agg = {
        params: {
          drop_partials: true,
          field: {
            name: 'other_time',
          },
        },
      } as IAggConfig;
      const timeRange = {
        from: moment(150),
        to: moment(350),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(aggResp, agg, timeRange);

      expect(buckets).toHaveLength(4);
    });

    test('does drop bucket when multiple time fields specified', () => {
      const agg = {
        params: {
          drop_partials: true,
          field: {
            name: 'date',
          },
        },
      } as IAggConfig;
      const timeRange = {
        from: moment(100),
        to: moment(350),
        timeFields: ['date', 'other_datefield'],
      };
      const buckets = new TabifyBuckets(aggResp, agg, timeRange);

      expect(buckets.buckets.map((b: Bucket) => b.key)).toEqual([100, 200]);
    });

    test('does not drop bucket when no timeFields have been specified', () => {
      const agg = {
        params: {
          drop_partials: true,
          field: {
            name: 'date',
          },
        },
      } as IAggConfig;
      const timeRange = {
        from: moment(100),
        to: moment(350),
        timeFields: [],
      };
      const buckets = new TabifyBuckets(aggResp, agg, timeRange);

      expect(buckets.buckets.map((b: Bucket) => b.key)).toEqual([0, 100, 200, 300]);
    });
  });
});
