/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { mergeQueries } from './merge_queries';

const kql = (expression: string) => ({ language: 'kql' as const, expression });
const lucene = (expression: string) => ({ language: 'lucene' as const, expression });
const config = { queryStringOptions: { analyze_wildcard: true }, dateFormatTZ: 'UTC' };

describe('mergeQueries', () => {
  it('returns no query when neither is set', () => {
    expect(mergeQueries(undefined, kql('  '), config)).toEqual({ query: undefined, filters: [] });
  });

  it('keeps the only query that is set', () => {
    expect(mergeQueries(kql('a : 1'), undefined, config)).toEqual({
      query: kql('a : 1'),
      filters: [],
    });
    expect(mergeQueries(kql(''), lucene('b:2'), config)).toEqual({
      query: lucene('b:2'),
      filters: [],
    });
  });

  it('joins KQL queries with and', () => {
    expect(mergeQueries(kql('a : 1'), kql('b : 2 or c : 3'), config)).toEqual({
      query: kql('(a : 1) and (b : 2 or c : 3)'),
      filters: [],
    });
  });

  it('joins Lucene queries with AND', () => {
    expect(mergeQueries(lucene('a:1'), lucene('b:2 OR c:3'), config)).toEqual({
      query: lucene('(a:1) AND (b:2 OR c:3)'),
      filters: [],
    });
  });

  it.each([
    ['library', kql('a : 1'), lucene('b:2')],
    ['panel', lucene('b:2'), kql('a : 1')],
  ])('keeps the KQL query from the %s and turns the Lucene one into a filter', (_, left, right) => {
    const queryString = { query: 'b:2', analyze_wildcard: true, time_zone: 'UTC' };
    const merged = mergeQueries(left, right, config);

    expect(merged).toEqual({
      query: kql('a : 1'),
      filters: [{ type: 'dsl', dsl: { query: { query_string: queryString } } }],
    });
    expect(toStoredFilters(merged.filters)?.[0].query).toEqual({ query_string: queryString });
  });
});
