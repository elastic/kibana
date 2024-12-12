/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFilterTerms } from './terms';
import { AggConfigs, CreateAggConfigParams } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { BUCKET_TYPES } from '../bucket_agg_types';
import { IBucketAggConfig } from '../bucket_agg_type';
import { Filter, ExistsFilter } from '@kbn/es-query';

describe('AggConfig Filters', () => {
  describe('terms', () => {
    const getAggConfigs = (aggs: CreateAggConfigParams[]) => {
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
        aggs,
        {
          typesRegistry: mockAggTypesRegistry(),
        },
        jest.fn()
      );
    };

    test('should return a match_phrase filter for terms', () => {
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
      expect(filter.query?.match_phrase).toHaveProperty('field');
      expect(filter.query?.match_phrase?.field).toBe('apache');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
    });

    test('should set query to true or false for boolean filter', () => {
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
      expect(filterFalse.query?.match_phrase).toHaveProperty('field');
      expect(filterFalse.query?.match_phrase?.field).toBeFalsy();

      const filterTrue = createFilterTerms(
        aggConfigs.aggs[0] as IBucketAggConfig,
        '1',
        {}
      ) as Filter;

      expect(filterTrue).toHaveProperty('query');
      expect(filterTrue.query).toHaveProperty('match_phrase');
      expect(filterTrue.query?.match_phrase).toHaveProperty('field');
      expect(filterTrue.query?.match_phrase?.field).toBeTruthy();
    });

    test('should generate correct __missing__ filter', () => {
      const aggConfigs = getAggConfigs([
        { type: BUCKET_TYPES.TERMS, schema: 'segment', params: { field: 'field' } },
      ]);
      const filter = createFilterTerms(
        aggConfigs.aggs[0] as IBucketAggConfig,
        '__missing__',
        {}
      ) as ExistsFilter;

      expect(filter.query).toHaveProperty('exists');
      expect(filter.query.exists).toHaveProperty('field', 'field');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.meta).toHaveProperty('negate', true);
    });

    test('should generate correct __other__ filter', () => {
      const aggConfigs = getAggConfigs([
        { type: BUCKET_TYPES.TERMS, schema: 'segment', params: { field: 'field' } },
      ]);

      const [filter] = createFilterTerms(aggConfigs.aggs[0] as IBucketAggConfig, '__other__', {
        terms: ['apache'],
      }) as Filter[];

      expect(filter).toHaveProperty('query');
      expect(filter.query).toHaveProperty('bool');
      expect(filter.query?.bool).toHaveProperty('should');
      expect((filter.query?.bool?.should as any)[0]).toHaveProperty('match_phrase');
      expect((filter.query?.bool!.should as any)[0].match_phrase).toHaveProperty('field', 'apache');
      expect(filter).toHaveProperty('meta');
      expect(filter.meta).toHaveProperty('index', '1234');
      expect(filter.meta).toHaveProperty('negate', true);
    });
  });
});
