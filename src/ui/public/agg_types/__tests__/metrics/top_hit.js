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

import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { topHitMetricAgg } from '../../metrics/top_hit';
import { VisProvider } from '../../../vis';
import StubbedIndexPattern from 'fixtures/stubbed_logstash_index_pattern';

describe('Top hit metric', function () {
  let aggDsl;
  let aggConfig;

  function init({ field, sortOrder = 'desc', aggregate = 'concat', size = 1 }) {
    ngMock.module('kibana');
    ngMock.inject(function (Private) {
      const Vis = Private(VisProvider);
      const indexPattern = Private(StubbedIndexPattern);

      const params = {};
      if (field) {
        params.field = field;
      }
      params.sortOrder = {
        val: sortOrder
      };
      params.aggregate = {
        val: aggregate
      };
      params.size = size;
      const vis = new Vis(indexPattern, {
        title: 'New Visualization',
        type: 'metric',
        params: {
          fontSize: 60
        },
        aggs: [
          {
            id: '1',
            type: 'top_hits',
            schema: 'metric',
            params
          }
        ],
        listeners: {}
      });

      // Grab the aggConfig off the vis (we don't actually use the vis for anything else)
      aggConfig = vis.aggs[0];
      aggDsl = aggConfig.toDsl();
    });
  }

  it('should return a label prefixed with Last if sorting in descending order', function () {
    init({ field: 'bytes' });
    expect(topHitMetricAgg.makeLabel(aggConfig)).to.eql('Last bytes');
  });

  it('should return a label prefixed with First if sorting in ascending order', function () {
    init({
      field: 'bytes',
      sortOrder: 'asc'
    });
    expect(topHitMetricAgg.makeLabel(aggConfig)).to.eql('First bytes');
  });

  it('should request the _source field', function () {
    init({ field: '_source' });
    expect(aggDsl.top_hits._source).to.be(true);
    expect(aggDsl.top_hits.docvalue_fields).to.be(undefined);
  });

  it('requests both source and docvalues_fields for non-text aggregatable fields', function () {
    init({ field: 'bytes' });
    expect(aggDsl.top_hits._source).to.be('bytes');
    expect(aggDsl.top_hits.docvalue_fields).to.eql([ { field: 'bytes', format: 'use_field_mapping' } ]);
  });

  it('requests both source and docvalues_fields for date aggregatable fields', function () {
    init({ field: '@timestamp' });
    expect(aggDsl.top_hits._source).to.be('@timestamp');
    expect(aggDsl.top_hits.docvalue_fields).to.eql([ { field: '@timestamp', format: 'date_time' } ]);
  });

  it('requests just source for aggregatable text fields', function () {
    init({ field: 'machine.os' });
    expect(aggDsl.top_hits._source).to.be('machine.os');
    expect(aggDsl.top_hits.docvalue_fields).to.be(undefined);
  });

  it('requests just source for not-aggregatable text fields', function () {
    init({ field: 'non-sortable' });
    expect(aggDsl.top_hits._source).to.be('non-sortable');
    expect(aggDsl.top_hits.docvalue_fields).to.be(undefined);
  });

  it('requests just source for not-aggregatable, non-text fields', function () {
    init({ field: 'hashed' });
    expect(aggDsl.top_hits._source).to.be('hashed');
    expect(aggDsl.top_hits.docvalue_fields).to.be(undefined);
  });

  describe('try to get the value from the top hit', function () {
    it('should return null if there is no hit', function () {
      const bucket = {
        '1': {
          hits: {
            hits: []
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.be(null);
    });

    it('should return undefined if the field does not appear in the source', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  bytes: 123
                }
              }
            ]
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.be(undefined);
    });

    it('should return the field value from the top hit', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': 'aaa'
                }
              }
            ]
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.be('aaa');
    });

    it('should return the object if the field value is an object', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': {
                    label: 'aaa'
                  }
                }
              }
            ]
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.eql({ label: 'aaa' });
    });

    it('should return an array if the field has more than one values', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': [ 'aaa', 'bbb' ]
                }
              }
            ]
          }
        }
      };

      init({ field: '@tags' });
      expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.eql([ 'aaa', 'bbb' ]);
    });

    it('should get the value from the doc_values field if the source does not have that field', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  'machine.os': 'linux'
                },
                fields: {
                  'machine.os.raw': [ 'linux' ]
                }
              }
            ]
          }
        }
      };

      init({ field: 'machine.os.raw' });
      expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.be('linux');
    });

    it('should return undefined if the field is not in the source nor in the doc_values field', function () {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  bytes: 12345
                },
                fields: {
                  bytes: 12345
                }
              }
            ]
          }
        }
      };

      init({ field: 'machine.os.raw' });
      expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.be(undefined);
    });

    describe('Multivalued field and first/last X docs', function () {
      it('should return a label prefixed with Last X docs if sorting in descending order', function () {
        init({
          field: 'bytes',
          size: 2
        });
        expect(topHitMetricAgg.makeLabel(aggConfig)).to.eql('Last 2 bytes');
      });

      it('should return a label prefixed with First X docs if sorting in ascending order', function () {
        init({
          field: 'bytes',
          size: 2,
          sortOrder: 'asc'
        });
        expect(topHitMetricAgg.makeLabel(aggConfig)).to.eql('First 2 bytes');
      });

      [
        {
          description: 'concat values with a comma',
          type: 'concat',
          data: [ 1, 2, 3 ],
          result: [ 1, 2, 3 ]
        },
        {
          description: 'sum up the values',
          type: 'sum',
          data: [ 1, 2, 3 ],
          result: 6
        },
        {
          description: 'take the minimum value',
          type: 'min',
          data: [ 1, 2, 3 ],
          result: 1
        },
        {
          description: 'take the maximum value',
          type: 'max',
          data: [ 1, 2, 3 ],
          result: 3
        },
        {
          description: 'take the average value',
          type: 'average',
          data: [ 1, 2, 3 ],
          result: 2
        },
        {
          description: 'support null/undefined',
          type: 'min',
          data: [ undefined, null ],
          result: null
        },
        {
          description: 'support null/undefined',
          type: 'max',
          data: [ undefined, null ],
          result: null
        },
        {
          description: 'support null/undefined',
          type: 'sum',
          data: [ undefined, null ],
          result: null
        },
        {
          description: 'support null/undefined',
          type: 'average',
          data: [ undefined, null ],
          result: null
        }
      ]
        .forEach(agg => {
          it(`should return the result of the ${agg.type} aggregation over the last doc - ${agg.description}`, function () {
            const bucket = {
              '1': {
                hits: {
                  hits: [
                    {
                      _source: {
                        bytes: agg.data
                      }
                    }
                  ]
                }
              }
            };

            init({ field: 'bytes', aggregate: agg.type });
            expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.eql(agg.result);
          });

          it(`should return the result of the ${agg.type} aggregation over the last X docs - ${agg.description}`, function () {
            const bucket = {
              '1': {
                hits: {
                  hits: [
                    {
                      _source: {
                        bytes: _.dropRight(agg.data, 1)
                      }
                    },
                    {
                      _source: {
                        bytes: _.last(agg.data)
                      }
                    }
                  ]
                }
              }
            };

            init({ field: 'bytes', aggregate: agg.type });
            expect(topHitMetricAgg.getValue(aggConfig, bucket)).to.eql(agg.result);
          });
        });
    });
  });
});
