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

import { AggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';

describe('Terms Agg', () => {
  describe('order agg editor UI', () => {
    const getAggConfigs = (params: Record<string, any> = {}) => {
      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
      } as any;

      const field = {
        name: 'field',
        indexPattern,
      };

      return new AggConfigs(
        indexPattern,
        [
          {
            id: 'test',
            params,
            type: BUCKET_TYPES.TERMS,
          },
        ],
        { typesRegistry: mockAggTypesRegistry() }
      );
    };

    test('converts object to string type', () => {
      const aggConfigs = getAggConfigs({
        include: {
          pattern: '404',
        },
        exclude: {
          pattern: '400',
        },
        field: {
          name: 'field',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('field');
      expect(params.include).toBe('404');
      expect(params.exclude).toBe('400');
    });

    test('accepts string from string field type and writes this value', () => {
      const aggConfigs = getAggConfigs({
        include: 'include value',
        exclude: 'exclude value',
        field: {
          name: 'string_field',
          type: 'string',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('string_field');
      expect(params.include).toBe('include value');
      expect(params.exclude).toBe('exclude value');
    });

    test('accepts empty array from number field type and does not write a value', () => {
      const aggConfigs = getAggConfigs({
        include: [],
        exclude: [],
        field: {
          name: 'empty_number_field',
          type: 'number',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('empty_number_field');
      expect(params.include).toBe(undefined);
      expect(params.exclude).toBe(undefined);
    });

    test('filters array with empty strings from number field type and writes only numbers', () => {
      const aggConfigs = getAggConfigs({
        include: [1.1, 2, '', 3.33, ''],
        exclude: ['', 4, 5.555, '', 6],
        field: {
          name: 'number_field',
          type: 'number',
        },
        orderAgg: {
          type: 'count',
        },
      });

      const { [BUCKET_TYPES.TERMS]: params } = aggConfigs.aggs[0].toDsl();

      expect(params.field).toBe('number_field');
      expect(params.include).toStrictEqual([1.1, 2, 3.33]);
      expect(params.exclude).toStrictEqual([4, 5.555, 6]);
    });
  });
});
