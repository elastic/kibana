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

import { createFilterTerms } from './terms';
import { AggConfigs } from '../../agg_configs';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../_bucket_agg_type';
import { Filter, ExistsFilter } from '../../../../../../../../plugins/data/public';

jest.mock('ui/new_platform');

describe('AggConfig Filters', () => {
  describe('terms', () => {
    const getAggConfigs = (aggs: Array<Record<string, any>>) => {
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

      return new AggConfigs(indexPattern, aggs, null);
    };

    it('should return a match_phrase filter for terms', () => {
      const aggConfigs = getAggConfigs([
        { type: BUCKET_TYPES.TERMS, schema: 'segment', params: { field: 'field' } },
      ]);

      const filter = createFilterTerms(
        aggConfigs.aggs[0] as IBucketAggConfig,
        'apache',
        {}
      ) as Filter;

      expect(filter).toHaveProperty('query');
      expect(filter.query).toHaveProperty('match_phrase');
      expect(filter.query.match_phrase).toHaveProperty('field');
      expect(filter.query.match_phrase.field).toBe('apache');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
    });

    it('should set query to true or false for boolean filter', () => {
      const aggConfigs = getAggConfigs([
        { type: BUCKET_TYPES.TERMS, schema: 'segment', params: { field: 'field' } },
      ]);

      const filterFalse = createFilterTerms(
        aggConfigs.aggs[0] as IBucketAggConfig,
        '',
        {}
      ) as Filter;

      expect(filterFalse).toHaveProperty('query');
      expect(filterFalse.query).toHaveProperty('match_phrase');
      expect(filterFalse.query.match_phrase).toHaveProperty('field');
      expect(filterFalse.query.match_phrase.field).toBeFalsy();

      const filterTrue = createFilterTerms(
        aggConfigs.aggs[0] as IBucketAggConfig,
        '1',
        {}
      ) as Filter;

      expect(filterTrue).toHaveProperty('query');
      expect(filterTrue.query).toHaveProperty('match_phrase');
      expect(filterTrue.query.match_phrase).toHaveProperty('field');
      expect(filterTrue.query.match_phrase.field).toBeTruthy();
    });

    it('should generate correct __missing__ filter', () => {
      const aggConfigs = getAggConfigs([
        { type: BUCKET_TYPES.TERMS, schema: 'segment', params: { field: 'field' } },
      ]);
      const filter = createFilterTerms(
        aggConfigs.aggs[0] as IBucketAggConfig,
        '__missing__',
        {}
      ) as ExistsFilter;

      expect(filter).toHaveProperty('exists');
      expect(filter.exists).toHaveProperty('field', 'field');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.meta).toHaveProperty('negate', true);
    });

    it('should generate correct __other__ filter', () => {
      const aggConfigs = getAggConfigs([
        { type: BUCKET_TYPES.TERMS, schema: 'segment', params: { field: 'field' } },
      ]);

      const [filter] = createFilterTerms(aggConfigs.aggs[0] as IBucketAggConfig, '__other__', {
        terms: ['apache'],
      }) as Filter[];

      expect(filter).toHaveProperty('query');
      expect(filter.query).toHaveProperty('bool');
      expect(filter.query.bool).toHaveProperty('should');
      expect(filter.query.bool.should[0]).toHaveProperty('match_phrase');
      expect(filter.query.bool.should[0].match_phrase).toHaveProperty('field', 'apache');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.meta).toHaveProperty('negate', true);
    });
  });
});
