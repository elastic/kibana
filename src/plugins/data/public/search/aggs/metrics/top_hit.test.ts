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

import { dropRight, last } from 'lodash';
import { getTopHitMetricAgg } from './top_hit';
import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { IMetricAggConfig } from './metric_agg_type';
import { KBN_FIELD_TYPES } from '../../../../common';

describe('Top hit metric', () => {
  let aggDsl: Record<string, any>;
  let aggConfig: IMetricAggConfig;

  const init = ({
    fieldName = 'field',
    sortOrder = 'desc',
    aggregate = 'concat',
    readFromDocValues = false,
    fieldType = KBN_FIELD_TYPES.NUMBER,
    size = 1,
  }: any) => {
    const typesRegistry = mockAggTypesRegistry([getTopHitMetricAgg()]);
    const field = {
      name: fieldName,
      displayName: fieldName,
      type: fieldType,
      readFromDocValues,
      format: {
        type: {
          id: 'bytes',
        },
      },
    };

    const params = {
      size,
      field: fieldName,
      sortField: field,
      sortOrder: {
        value: sortOrder,
      },
      aggregate: {
        value: aggregate,
      },
    };

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
      flattenHit: jest.fn((x) => x!._source),
    } as any;

    const aggConfigs = new AggConfigs(
      indexPattern,
      [
        {
          id: '1',
          type: 'top_hits',
          schema: 'metric',
          params,
        },
      ],
      { typesRegistry }
    );

    // Grab the aggConfig off the vis (we don't actually use the vis for anything else)
    aggConfig = aggConfigs.aggs[0] as IMetricAggConfig;
    aggDsl = aggConfig.toDsl(aggConfigs);
  };

  it('should return a label prefixed with Last if sorting in descending order', () => {
    init({ fieldName: 'bytes' });
    expect(getTopHitMetricAgg().makeLabel(aggConfig)).toEqual('Last bytes');
  });

  it('should return a label prefixed with First if sorting in ascending order', () => {
    init({
      fieldName: 'bytes',
      sortOrder: 'asc',
    });
    expect(getTopHitMetricAgg().makeLabel(aggConfig)).toEqual('First bytes');
  });

  it('should request the _source field', () => {
    init({ field: '_source' });
    expect(aggDsl.top_hits._source).toBeTruthy();
    expect(aggDsl.top_hits.docvalue_fields).toBeUndefined();
  });

  it('requests both source and docvalues_fields for non-text aggregatable fields', () => {
    init({ fieldName: 'bytes', readFromDocValues: true });
    expect(aggDsl.top_hits._source).toBe('bytes');
    expect(aggDsl.top_hits.docvalue_fields).toEqual([{ field: 'bytes' }]);
  });

  it('requests both source and docvalues_fields for date aggregatable fields', () => {
    init({ fieldName: '@timestamp', readFromDocValues: true, fieldType: KBN_FIELD_TYPES.DATE });

    expect(aggDsl.top_hits._source).toBe('@timestamp');
    expect(aggDsl.top_hits.docvalue_fields).toEqual([{ field: '@timestamp', format: 'date_time' }]);
  });

  it('requests just source for aggregatable text fields', () => {
    init({ fieldName: 'machine.os' });
    expect(aggDsl.top_hits._source).toBe('machine.os');
    expect(aggDsl.top_hits.docvalue_fields).toBeUndefined();
  });

  describe('try to get the value from the top hit', () => {
    it('should return null if there is no hit', () => {
      const bucket = {
        '1': {
          hits: {
            hits: [],
          },
        },
      };

      init({ fieldName: '@tags' });
      expect(getTopHitMetricAgg().getValue(aggConfig, bucket)).toBe(null);
    });
    //
    it('should return undefined if the field does not appear in the source', () => {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  bytes: 123,
                },
              },
            ],
          },
        },
      };

      init({ fieldName: '@tags' });
      expect(getTopHitMetricAgg().getValue(aggConfig, bucket)).toBe(undefined);
    });

    it('should return the field value from the top hit', () => {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': 'aaa',
                },
              },
            ],
          },
        },
      };

      init({ fieldName: '@tags' });
      expect(getTopHitMetricAgg().getValue(aggConfig, bucket)).toBe('aaa');
    });

    it('should return the object if the field value is an object', () => {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': {
                    label: 'aaa',
                  },
                },
              },
            ],
          },
        },
      };

      init({ fieldName: '@tags' });

      expect(getTopHitMetricAgg().getValue(aggConfig, bucket)).toEqual({
        label: 'aaa',
      });
    });

    it('should return an array if the field has more than one values', () => {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  '@tags': ['aaa', 'bbb'],
                },
              },
            ],
          },
        },
      };

      init({ fieldName: '@tags' });
      expect(getTopHitMetricAgg().getValue(aggConfig, bucket)).toEqual(['aaa', 'bbb']);
    });

    it('should return undefined if the field is not in the source nor in the doc_values field', () => {
      const bucket = {
        '1': {
          hits: {
            hits: [
              {
                _source: {
                  bytes: 12345,
                },
                fields: {
                  bytes: 12345,
                },
              },
            ],
          },
        },
      };

      init({ fieldName: 'machine.os.raw', readFromDocValues: true });
      expect(getTopHitMetricAgg().getValue(aggConfig, bucket)).toBe(undefined);
    });

    describe('Multivalued field and first/last X docs', () => {
      it('should return a label prefixed with Last X docs if sorting in descending order', () => {
        init({
          fieldName: 'bytes',
          size: 2,
        });
        expect(getTopHitMetricAgg().makeLabel(aggConfig)).toEqual('Last 2 bytes');
      });

      it('should return a label prefixed with First X docs if sorting in ascending order', () => {
        init({
          fieldName: 'bytes',
          size: 2,
          sortOrder: 'asc',
        });
        expect(getTopHitMetricAgg().makeLabel(aggConfig)).toEqual('First 2 bytes');
      });

      [
        {
          description: 'concat values with a comma',
          type: 'concat',
          data: [1, 2, 3],
          result: [1, 2, 3],
        },
        {
          description: 'sum up the values',
          type: 'sum',
          data: [1, 2, 3],
          result: 6,
        },
        {
          description: 'take the minimum value',
          type: 'min',
          data: [1, 2, 3],
          result: 1,
        },
        {
          description: 'take the maximum value',
          type: 'max',
          data: [1, 2, 3],
          result: 3,
        },
        {
          description: 'take the average value',
          type: 'average',
          data: [1, 2, 3],
          result: 2,
        },
        {
          description: 'support null/undefined',
          type: 'min',
          data: [undefined, null],
          result: null,
        },
        {
          description: 'support null/undefined',
          type: 'max',
          data: [undefined, null],
          result: null,
        },
        {
          description: 'support null/undefined',
          type: 'sum',
          data: [undefined, null],
          result: null,
        },
        {
          description: 'support null/undefined',
          type: 'average',
          data: [undefined, null],
          result: null,
        },
      ].forEach((agg) => {
        it(`should return the result of the ${agg.type} aggregation over the last doc - ${agg.description}`, () => {
          const bucket = {
            '1': {
              hits: {
                hits: [
                  {
                    _source: {
                      bytes: agg.data,
                    },
                  },
                ],
              },
            },
          };

          init({ fieldName: 'bytes', aggregate: agg.type });
          expect(getTopHitMetricAgg().getValue(aggConfig, bucket)).toEqual(agg.result);
        });

        it(`should return the result of the ${agg.type} aggregation over the last X docs - ${agg.description}`, () => {
          const bucket = {
            '1': {
              hits: {
                hits: [
                  {
                    _source: {
                      bytes: dropRight(agg.data, 1),
                    },
                  },
                  {
                    _source: {
                      bytes: last(agg.data),
                    },
                  },
                ],
              },
            },
          };

          init({ fieldName: 'bytes', aggregate: agg.type });
          expect(getTopHitMetricAgg().getValue(aggConfig, bucket)).toEqual(agg.result);
        });
      });
    });
  });
});
