/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeQueries } from './merge_queries';

const kql = (expression: string) => ({ language: 'kql' as const, expression });
const lucene = (expression: string) => ({ language: 'lucene' as const, expression });

describe('mergeQueries', () => {
  it('returns no query when neither is set', () => {
    expect(mergeQueries(undefined, kql('  '))).toEqual({ query: undefined, filters: [] });
  });

  it('keeps the only query that is set', () => {
    expect(mergeQueries(kql('a : 1'), undefined)).toEqual({ query: kql('a : 1'), filters: [] });
    expect(mergeQueries(kql(''), lucene('b:2'))).toEqual({ query: lucene('b:2'), filters: [] });
  });

  it('joins KQL queries with and', () => {
    expect(mergeQueries(kql('a : 1'), kql('b : 2 or c : 3'))).toEqual({
      query: kql('(a : 1) and (b : 2 or c : 3)'),
      filters: [],
    });
  });

  it('joins Lucene queries with AND', () => {
    expect(mergeQueries(lucene('a:1'), lucene('b:2 OR c:3'))).toEqual({
      query: lucene('(a:1) AND (b:2 OR c:3)'),
      filters: [],
    });
  });

  it.each([
    ['library', kql('a : 1'), lucene('b:2')],
    ['panel', lucene('b:2'), kql('a : 1')],
  ])('keeps the KQL query from the %s and turns the Lucene one into a filter', (_, left, right) => {
    expect(mergeQueries(left, right)).toEqual({
      query: kql('a : 1'),
      filters: [{ type: 'dsl', dsl: { query_string: { query: 'b:2' } } }],
    });
  });
});
