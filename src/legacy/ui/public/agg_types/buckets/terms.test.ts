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

import { AggConfigs } from '../index';
import { BUCKET_TYPES } from './bucket_agg_types';

jest.mock('ui/new_platform');

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
        null
      );
    };

    it('converts object to string type', function() {
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
  });
});
