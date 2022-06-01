/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractTimeFilter } from './extract_time_filter';
import { Filter, buildQueryFilter, buildRangeFilter, buildPhraseFilter } from '../build_filters';
import { DataViewBase, DataViewFieldBase } from '../../es_query';

describe('filter manager utilities', () => {
  let indexPattern: DataViewBase;

  beforeEach(() => {
    indexPattern = {
      id: 'logstash-*',
    } as DataViewBase;
  });

  describe('extractTimeFilter()', () => {
    test('should detect timeFilter', async () => {
      const filters: Filter[] = [
        buildQueryFilter({ query_string: { query: 'apache' } }, 'logstash-*', ''),
        buildRangeFilter(
          { name: 'time' } as DataViewFieldBase,
          { gt: 1388559600000, lt: 1388646000000 },
          indexPattern
        ),
      ];
      const result = await extractTimeFilter('time', filters);

      expect(result.timeRangeFilter).toEqual(filters[1]);
      expect(result.restOfFilters[0]).toEqual(filters[0]);
    });

    test("should not return timeFilter when name doesn't match", async () => {
      const filters: Filter[] = [
        buildQueryFilter({ query_string: { query: 'apache' } }, 'logstash-*', ''),
        buildRangeFilter(
          { name: '@timestamp' } as DataViewFieldBase,
          { from: 1, to: 2 },
          indexPattern,
          ''
        ),
      ];
      const result = await extractTimeFilter('time', filters);

      expect(result.timeRangeFilter).toBeUndefined();
      expect(result.restOfFilters).toEqual(filters);
    });

    test('should not return a non range filter, even when names match', async () => {
      const filters: Filter[] = [
        buildQueryFilter({ query_string: { query: 'apache' } }, 'logstash-*', ''),
        buildPhraseFilter({ name: 'time' } as DataViewFieldBase, 'banana', indexPattern),
      ];
      const result = await extractTimeFilter('time', filters);

      expect(result.timeRangeFilter).toBeUndefined();
      expect(result.restOfFilters).toEqual(filters);
    });
  });
});
