/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TabifyBuckets } from './buckets';
import { AggGroupNames } from '../aggs';
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

      const aggParams = {
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
      };

      const buckets = new TabifyBuckets(aggResp, aggParams);

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

      const aggParams = {
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
      };

      const buckets = new TabifyBuckets(aggResp, aggParams);

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

      const aggParams = {
        filters: [
          {
            label: '',
            input: { query: { match_all: {} } },
          },
        ],
      };

      const buckets = new TabifyBuckets(aggResp, aggParams);

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
      const aggParams = {
        drop_partials: true,
        field: {
          name: 'date',
        },
      };
      const timeRange = {
        from: moment(150),
        to: moment(350),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);

      expect(buckets).toHaveLength(1);
    });

    test('keeps partial buckets when disabled', () => {
      const aggParams = {
        drop_partials: false,
        field: {
          name: 'date',
        },
      };
      const timeRange = {
        from: moment(150),
        to: moment(350),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);

      expect(buckets).toHaveLength(4);
    });

    test('keeps aligned buckets when enabled', () => {
      const aggParams = {
        drop_partials: true,
        field: {
          name: 'date',
        },
      };
      const timeRange = {
        from: moment(100),
        to: moment(400),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);

      expect(buckets).toHaveLength(3);
    });

    test('does not drop buckets for non-timerange fields', () => {
      const aggParams = {
        drop_partials: true,
        field: {
          name: 'other_time',
        },
      };
      const timeRange = {
        from: moment(150),
        to: moment(350),
        timeFields: ['date'],
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);

      expect(buckets).toHaveLength(4);
    });

    test('does drop bucket when multiple time fields specified', () => {
      const aggParams = {
        drop_partials: true,
        field: {
          name: 'date',
        },
      };
      const timeRange = {
        from: moment(100),
        to: moment(350),
        timeFields: ['date', 'other_datefield'],
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);

      expect(buckets.buckets.map((b: Bucket) => b.key)).toEqual([100, 200]);
    });

    test('does not drop bucket when no timeFields have been specified', () => {
      const aggParams = {
        drop_partials: true,
        field: {
          name: 'date',
        },
      };
      const timeRange = {
        from: moment(100),
        to: moment(350),
        timeFields: [],
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);

      expect(buckets.buckets.map((b: Bucket) => b.key)).toEqual([0, 100, 200, 300]);
    });
  });
});
