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

import {
  buildOtherBucketAgg,
  mergeOtherBucketAggResponse,
  updateMissingBucket,
} from './_terms_other_bucket_helper';
import { AggConfigs, CreateAggConfigParams } from '../agg_configs';
import { BUCKET_TYPES } from './bucket_agg_types';
import { IBucketAggConfig } from './bucket_agg_type';
import { mockAggTypesRegistry } from '../test_helpers';

const indexPattern = {
  id: '1234',
  title: 'logstash-*',
  fields: [
    {
      name: 'field',
    },
  ],
} as any;

const singleTerm = {
  aggs: [
    {
      id: '1',
      type: BUCKET_TYPES.TERMS,
      params: {
        field: {
          name: 'machine.os.raw',
          indexPattern,
          filterable: true,
        },
        otherBucket: true,
        missingBucket: true,
      },
    },
  ],
};

const nestedTerm = {
  aggs: [
    {
      id: '1',
      type: BUCKET_TYPES.TERMS,
      params: {
        field: {
          name: 'geo.src',
          indexPattern,
          filterable: true,
        },
        size: 2,
        otherBucket: false,
        missingBucket: false,
      },
    },
    {
      id: '2',
      type: BUCKET_TYPES.TERMS,
      params: {
        field: {
          name: 'machine.os.raw',
          indexPattern,
          filterable: true,
        },
        size: 2,
        otherBucket: true,
        missingBucket: true,
      },
    },
  ],
};

const singleTermResponse = {
  took: 10,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: 14005,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    '1': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 8325,
      buckets: [
        { key: 'ios', doc_count: 2850 },
        { key: 'win xp', doc_count: 2830 },
        { key: '__missing__', doc_count: 1430 },
      ],
    },
  },
  status: 200,
};

const nestedTermResponse = {
  took: 10,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: 14005,
    max_score: 0,
    hits: [],
  },
  aggregations: {
    '1': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 8325,
      buckets: [
        {
          '2': {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 8325,
            buckets: [
              { key: 'ios', doc_count: 2850 },
              { key: 'win xp', doc_count: 2830 },
              { key: '__missing__', doc_count: 1430 },
            ],
          },
          key: 'US',
          doc_count: 2850,
        },
        {
          '2': {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 8325,
            buckets: [
              { key: 'ios', doc_count: 1850 },
              { key: 'win xp', doc_count: 1830 },
              { key: '__missing__', doc_count: 130 },
            ],
          },
          key: 'IN',
          doc_count: 2830,
        },
      ],
    },
  },
  status: 200,
};

const nestedTermResponseNoResults = {
  took: 10,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: 0,
    max_score: null,
    hits: [],
  },
  aggregations: {
    '1': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
  },
  status: 200,
};

const singleOtherResponse = {
  took: 3,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: 14005, max_score: 0, hits: [] },
  aggregations: {
    'other-filter': {
      buckets: { '': { doc_count: 2805 } },
    },
  },
  status: 200,
};

const nestedOtherResponse = {
  took: 3,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: 14005, max_score: 0, hits: [] },
  aggregations: {
    'other-filter': {
      buckets: { '-US': { doc_count: 2805 }, '-IN': { doc_count: 2804 } },
    },
  },
  status: 200,
};

describe('Terms Agg Other bucket helper', () => {
  const typesRegistry = mockAggTypesRegistry();

  const getAggConfigs = (aggs: CreateAggConfigParams[] = []) => {
    return new AggConfigs(indexPattern, [...aggs], { typesRegistry });
  };

  describe('buildOtherBucketAgg', () => {
    test('returns a function', () => {
      const aggConfigs = getAggConfigs(singleTerm.aggs);
      const agg = buildOtherBucketAgg(
        aggConfigs,
        aggConfigs.aggs[0] as IBucketAggConfig,
        singleTermResponse
      );
      expect(typeof agg).toBe('function');
    });

    test('correctly builds query with single terms agg', () => {
      const aggConfigs = getAggConfigs(singleTerm.aggs);
      const agg = buildOtherBucketAgg(
        aggConfigs,
        aggConfigs.aggs[0] as IBucketAggConfig,
        singleTermResponse
      );
      const expectedResponse = {
        aggs: undefined,
        filters: {
          filters: {
            '': {
              bool: {
                must: [],
                filter: [{ exists: { field: 'machine.os.raw' } }],
                should: [],
                must_not: [
                  { match_phrase: { 'machine.os.raw': 'ios' } },
                  { match_phrase: { 'machine.os.raw': 'win xp' } },
                ],
              },
            },
          },
        },
      };
      expect(agg).toBeDefined();
      if (agg) {
        expect(agg()['other-filter']).toEqual(expectedResponse);
      }
    });

    test('correctly builds query for nested terms agg', () => {
      const aggConfigs = getAggConfigs(nestedTerm.aggs);
      const agg = buildOtherBucketAgg(
        aggConfigs,
        aggConfigs.aggs[1] as IBucketAggConfig,
        nestedTermResponse
      );
      const expectedResponse = {
        'other-filter': {
          aggs: undefined,
          filters: {
            filters: {
              '-IN': {
                bool: {
                  must: [],
                  filter: [
                    { match_phrase: { 'geo.src': 'IN' } },
                    { exists: { field: 'machine.os.raw' } },
                  ],
                  should: [],
                  must_not: [
                    { match_phrase: { 'machine.os.raw': 'ios' } },
                    { match_phrase: { 'machine.os.raw': 'win xp' } },
                  ],
                },
              },
              '-US': {
                bool: {
                  must: [],
                  filter: [
                    { match_phrase: { 'geo.src': 'US' } },
                    { exists: { field: 'machine.os.raw' } },
                  ],
                  should: [],
                  must_not: [
                    { match_phrase: { 'machine.os.raw': 'ios' } },
                    { match_phrase: { 'machine.os.raw': 'win xp' } },
                  ],
                },
              },
            },
          },
        },
      };
      expect(agg).toBeDefined();
      if (agg) {
        expect(agg()).toEqual(expectedResponse);
      }
    });

    test('returns false when nested terms agg has no buckets', () => {
      const aggConfigs = getAggConfigs(nestedTerm.aggs);
      const agg = buildOtherBucketAgg(
        aggConfigs,
        aggConfigs.aggs[1] as IBucketAggConfig,
        nestedTermResponseNoResults
      );

      expect(agg).toEqual(false);
    });
  });

  describe('mergeOtherBucketAggResponse', () => {
    test('correctly merges other bucket with single terms agg', () => {
      const aggConfigs = getAggConfigs(singleTerm.aggs);
      const otherAggConfig = buildOtherBucketAgg(
        aggConfigs,
        aggConfigs.aggs[0] as IBucketAggConfig,
        singleTermResponse
      );

      expect(otherAggConfig).toBeDefined();
      if (otherAggConfig) {
        const mergedResponse = mergeOtherBucketAggResponse(
          aggConfigs,
          singleTermResponse,
          singleOtherResponse,
          aggConfigs.aggs[0] as IBucketAggConfig,
          otherAggConfig()
        );
        expect(mergedResponse.aggregations['1'].buckets[3].key).toEqual('__other__');
      }
    });

    test('correctly merges other bucket with nested terms agg', () => {
      const aggConfigs = getAggConfigs(nestedTerm.aggs);
      const otherAggConfig = buildOtherBucketAgg(
        aggConfigs,
        aggConfigs.aggs[1] as IBucketAggConfig,
        nestedTermResponse
      );

      expect(otherAggConfig).toBeDefined();
      if (otherAggConfig) {
        const mergedResponse = mergeOtherBucketAggResponse(
          aggConfigs,
          nestedTermResponse,
          nestedOtherResponse,
          aggConfigs.aggs[1] as IBucketAggConfig,
          otherAggConfig()
        );

        expect(mergedResponse.aggregations['1'].buckets[1]['2'].buckets[3].key).toEqual(
          '__other__'
        );
      }
    });
  });

  describe('updateMissingBucket', () => {
    test('correctly updates missing bucket key', () => {
      const aggConfigs = getAggConfigs(nestedTerm.aggs);
      const updatedResponse = updateMissingBucket(
        singleTermResponse,
        aggConfigs,
        aggConfigs.aggs[0] as IBucketAggConfig
      );
      expect(
        updatedResponse.aggregations['1'].buckets.find(
          (bucket: Record<string, any>) => bucket.key === '__missing__'
        )
      ).toBeDefined();
    });
  });
});
