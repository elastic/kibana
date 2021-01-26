/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createFilterFilters } from './filters';
import { AggConfigs } from '../../agg_configs';
import { mockAggTypesRegistry } from '../../test_helpers';
import { IBucketAggConfig } from '../bucket_agg_type';

describe('AggConfig Filters', () => {
  describe('filters', () => {
    const getAggConfigs = () => {
      const field = {
        name: 'bytes',
      };

      const indexPattern = {
        id: '1234',
        title: 'logstash-*',
        fields: {
          getByName: () => field,
          filter: () => [field],
        },
      } as any;

      return new AggConfigs(
        indexPattern,
        [
          {
            type: 'filters',
            schema: 'segment',
            params: {
              filters: [
                { input: { query: 'type:apache', language: 'lucene' } },
                { input: { query: 'type:nginx', language: 'lucene' } },
              ],
            },
          },
        ],
        {
          typesRegistry: mockAggTypesRegistry(),
        }
      );
    };

    test('should return a filters filter', () => {
      const aggConfigs = getAggConfigs();
      const filter = createFilterFilters(aggConfigs.aggs[0] as IBucketAggConfig, 'type:nginx');

      expect(filter!.query.bool.must[0].query_string.query).toBe('type:nginx');
      expect(filter!.meta).toHaveProperty('index', '1234');
      expect(filter!.meta).toHaveProperty('alias', 'type:nginx');
    });
  });
});
