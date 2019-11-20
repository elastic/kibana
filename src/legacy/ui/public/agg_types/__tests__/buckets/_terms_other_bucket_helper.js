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
import ngMock from 'ng_mock';
import { buildOtherBucketAgg, mergeOtherBucketAggResponse, updateMissingBucket } from '../../buckets/_terms_other_bucket_helper';
import { Vis } from '../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

const visConfigSingleTerm = {
  type: 'pie',
  aggs: [
    {
      type: 'terms',
      schema: 'segment',
      params: { field: 'machine.os.raw', otherBucket: true, missingBucket: true }
    }
  ]
};

const visConfigNestedTerm = {
  type: 'pie',
  aggs: [
    {
      type: 'terms',
      schema: 'segment',
      params: { field: 'geo.src', size: 2, otherBucket: false, missingBucket: false }
    }, {
      type: 'terms',
      schema: 'segment',
      params: { field: 'machine.os.raw', size: 2, otherBucket: true, missingBucket: true }
    }
  ]
};

const singleTermResponse = {
  'took': 10,
  'timed_out': false,
  '_shards': {
    'total': 1, 'successful': 1, 'skipped': 0, 'failed': 0
  }, 'hits': {
    'total': 14005, 'max_score': 0, 'hits': []
  }, 'aggregations': {
    '1': {
      'doc_count_error_upper_bound': 0,
      'sum_other_doc_count': 8325,
      'buckets': [
        { 'key': 'ios', 'doc_count': 2850 },
        { 'key': 'win xp', 'doc_count': 2830 },
        { 'key': '__missing__', 'doc_count': 1430 }
      ]
    }
  }, 'status': 200
};

const nestedTermResponse = {
  'took': 10,
  'timed_out': false,
  '_shards': {
    'total': 1, 'successful': 1, 'skipped': 0, 'failed': 0
  }, 'hits': {
    'total': 14005, 'max_score': 0, 'hits': []
  }, 'aggregations': {
    '1': {
      'doc_count_error_upper_bound': 0,
      'sum_other_doc_count': 8325,
      'buckets': [
        {
          '2': {
            'doc_count_error_upper_bound': 0,
            'sum_other_doc_count': 8325,
            'buckets': [
              { 'key': 'ios', 'doc_count': 2850 },
              { 'key': 'win xp', 'doc_count': 2830 },
              { 'key': '__missing__', 'doc_count': 1430 }
            ]
          },
          key: 'US',
          doc_count: 2850
        }, {
          '2': {
            'doc_count_error_upper_bound': 0,
            'sum_other_doc_count': 8325,
            'buckets': [
              { 'key': 'ios', 'doc_count': 1850 },
              { 'key': 'win xp', 'doc_count': 1830 },
              { 'key': '__missing__', 'doc_count': 130 }
            ]
          },
          key: 'IN',
          doc_count: 2830
        }
      ]
    }
  }, 'status': 200
};

const nestedTermResponseNoResults = {
  'took': 10,
  'timed_out': false,
  '_shards': {
    'total': 1, 'successful': 1, 'skipped': 0, 'failed': 0
  }, 'hits': {
    'total': 0, 'max_score': null, 'hits': []
  }, 'aggregations': {
    '1': {
      'doc_count_error_upper_bound': 0,
      'sum_other_doc_count': 0,
      'buckets': []
    }
  }, 'status': 200
};

const singleOtherResponse = {
  'took': 3,
  'timed_out': false,
  '_shards': { 'total': 1, 'successful': 1, 'skipped': 0, 'failed': 0 },
  'hits': { 'total': 14005, 'max_score': 0, 'hits': [] },
  'aggregations': {
    'other-filter': {
      'buckets': { '': { 'doc_count': 2805 } }
    }
  }, 'status': 200
};

const nestedOtherResponse = {
  'took': 3,
  'timed_out': false,
  '_shards': { 'total': 1, 'successful': 1, 'skipped': 0, 'failed': 0 },
  'hits': { 'total': 14005, 'max_score': 0, 'hits': [] },
  'aggregations': {
    'other-filter': {
      'buckets': { '-US': { 'doc_count': 2805 }, '-IN': { 'doc_count': 2804 } }
    }
  }, 'status': 200
};

describe('Terms Agg Other bucket helper', () => {

  let vis;

  function init(aggConfig) {
    ngMock.module('kibana');
    ngMock.inject((Private) => {
      const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

      vis = new Vis(indexPattern, aggConfig);
    });
  }

  describe('buildOtherBucketAgg', () => {

    it('returns a function', () => {
      init(visConfigSingleTerm);
      const agg = buildOtherBucketAgg(vis.aggs, vis.aggs.aggs[0], singleTermResponse);
      expect(agg).to.be.a('function');
    });

    it('correctly builds query with single terms agg', () => {
      init(visConfigSingleTerm);
      const agg = buildOtherBucketAgg(vis.aggs, vis.aggs.aggs[0], singleTermResponse)();
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
                  { match_phrase: { 'machine.os.raw': 'win xp' } }
                ]
              }
            },
          }
        }
      };

      expect(agg['other-filter']).to.eql(expectedResponse);
    });

    it('correctly builds query for nested terms agg', () => {
      init(visConfigNestedTerm);
      const agg = buildOtherBucketAgg(vis.aggs, vis.aggs.aggs[1], nestedTermResponse)();
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
                    { exists: { field: 'machine.os.raw' } }
                  ],
                  should: [],
                  must_not: [
                    { match_phrase: { 'machine.os.raw': 'ios' } },
                    { match_phrase: { 'machine.os.raw': 'win xp' } }
                  ]
                }
              },
              '-US': {
                bool: {
                  must: [],
                  filter: [
                    { match_phrase: { 'geo.src': 'US' } },
                    { exists: { field: 'machine.os.raw' } }
                  ],
                  should: [],
                  must_not: [
                    { match_phrase: { 'machine.os.raw': 'ios' } },
                    { match_phrase: { 'machine.os.raw': 'win xp' } }
                  ]
                }
              },
            }
          }
        }
      };

      expect(agg).to.eql(expectedResponse);
    });

    it('returns false when nested terms agg has no buckets', () => {
      init(visConfigNestedTerm);
      const agg = buildOtherBucketAgg(vis.aggs, vis.aggs.aggs[1], nestedTermResponseNoResults);
      expect(agg).to.eql(false);
    });
  });

  describe('mergeOtherBucketAggResponse', () => {
    it('correctly merges other bucket with single terms agg', () => {
      init(visConfigSingleTerm);
      const otherAggConfig = buildOtherBucketAgg(vis.aggs, vis.aggs.aggs[0], singleTermResponse)();
      const mergedResponse = mergeOtherBucketAggResponse(
        vis.aggs,
        singleTermResponse,
        singleOtherResponse,
        vis.aggs.aggs[0],
        otherAggConfig);

      expect(mergedResponse.aggregations['1'].buckets[3].key).to.equal('__other__');
    });

    it('correctly merges other bucket with nested terms agg', () => {
      init(visConfigNestedTerm);
      const otherAggConfig = buildOtherBucketAgg(vis.aggs, vis.aggs.aggs[1], nestedTermResponse)();
      const mergedResponse = mergeOtherBucketAggResponse(vis.aggs, nestedTermResponse,
        nestedOtherResponse, vis.aggs.aggs[1], otherAggConfig);

      expect(mergedResponse.aggregations['1'].buckets[1]['2'].buckets[3].key).to.equal('__other__');
    });

  });

  describe('updateMissingBucket', () => {
    it('correctly updates missing bucket key', () => {
      init(visConfigNestedTerm);
      const updatedResponse = updateMissingBucket(singleTermResponse, vis.aggs, vis.aggs.aggs[0]);
      expect(updatedResponse.aggregations['1'].buckets.find(bucket => bucket.key === '__missing__')).to.not.be('undefined');
    });

  });
});
