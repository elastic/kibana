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

import expect from '@kbn/expect';
import { TabifyBuckets } from '../_buckets';

describe('Buckets wrapper', function() {
  function test(aggResp, count, keys) {
    it('reads the length', function() {
      const buckets = new TabifyBuckets(aggResp);
      expect(buckets).to.have.length(count);
    });

    it('iterates properly, passing in the key', function() {
      const buckets = new TabifyBuckets(aggResp);
      const keysSent = [];
      buckets.forEach(function(bucket, key) {
        keysSent.push(key);
      });

      expect(keysSent).to.have.length(count);
      expect(keysSent).to.eql(keys);
    });
  }

  describe('with object style buckets', function() {
    const aggResp = {
      buckets: {
        '0-100': {},
        '100-200': {},
        '200-300': {},
      },
    };

    const count = 3;
    const keys = ['0-100', '100-200', '200-300'];

    test(aggResp, count, keys);

    it('should accept filters agg queries with strings', () => {
      const aggResp = {
        buckets: {
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
      expect(buckets).to.have.length(2);
      buckets._keys.forEach(key => {
        expect(key).to.be.a('string');
      });
    });

    it('should accept filters agg queries with query_string queries', () => {
      const aggResp = {
        buckets: {
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
      expect(buckets).to.have.length(2);
      buckets._keys.forEach(key => {
        expect(key).to.be.a('string');
      });
    });

    it('should accept filters agg queries with query dsl queries', () => {
      const aggResp = {
        buckets: {
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
      expect(buckets).to.have.length(1);
      buckets._keys.forEach(key => {
        expect(key).to.be.a('string');
      });
    });
  });

  describe('with array style buckets', function() {
    const aggResp = {
      buckets: [
        { key: '0-100', value: {} },
        { key: '100-200', value: {} },
        { key: '200-300', value: {} },
      ],
    };

    const count = 3;
    const keys = ['0-100', '100-200', '200-300'];

    test(aggResp, count, keys);
  });

  describe('with single bucket aggregations (filter)', function() {
    it('creates single bucket from agg content', function() {
      const aggResp = {
        single_bucket: {},
        doc_count: 5,
      };
      const buckets = new TabifyBuckets(aggResp);
      expect(buckets).to.have.length(1);
    });
  });

  describe('drop_partial option', function() {
    const aggResp = {
      buckets: [
        { key: 0, value: {} },
        { key: 100, value: {} },
        { key: 200, value: {} },
        { key: 300, value: {} },
      ],
    };

    it('drops partial buckets when enabled', function() {
      const aggParams = {
        drop_partials: true,
        field: {
          name: 'date',
        },
      };
      const timeRange = {
        gte: 150,
        lte: 350,
        name: 'date',
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);
      expect(buckets).to.have.length(1);
    });

    it('keeps partial buckets when disabled', function() {
      const aggParams = {
        drop_partials: false,
        field: {
          name: 'date',
        },
      };
      const timeRange = {
        gte: 150,
        lte: 350,
        name: 'date',
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);
      expect(buckets).to.have.length(4);
    });

    it('keeps aligned buckets when enabled', function() {
      const aggParams = {
        drop_partials: true,
        field: {
          name: 'date',
        },
      };
      const timeRange = {
        gte: 100,
        lte: 400,
        name: 'date',
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);
      expect(buckets).to.have.length(3);
    });

    it('does not drop buckets for non-timerange fields', function() {
      const aggParams = {
        drop_partials: true,
        field: {
          name: 'other_time',
        },
      };
      const timeRange = {
        gte: 150,
        lte: 350,
        name: 'date',
      };
      const buckets = new TabifyBuckets(aggResp, aggParams, timeRange);
      expect(buckets).to.have.length(4);
    });
  });
});
