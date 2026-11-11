/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildQuery, QueryParseError } from './build_query';

describe('buildQuery', () => {
  it('matches everything for an empty query in any language', () => {
    expect(buildQuery('kql', ' ')).toEqual({ match_all: {} });
    expect(buildQuery('lucene', '')).toEqual({ match_all: {} });
    expect(buildQuery('dsl', '')).toEqual({ match_all: {} });
  });

  it('converts KQL into Elasticsearch query DSL', () => {
    expect(buildQuery('kql', 'status: 500')).toHaveProperty('bool');
  });

  it('converts nested KQL used for event log saved object references without an index pattern', () => {
    expect(
      JSON.stringify(buildQuery('kql', 'kibana.saved_objects:{ type: "alert" and id: "r1" }'))
    ).toContain('"nested":{"path":"kibana.saved_objects"');
  });

  it('wraps Lucene syntax in a query_string query', () => {
    expect(buildQuery('lucene', 'status:500')).toEqual({ query_string: { query: 'status:500' } });
  });

  it('passes through a Query DSL object', () => {
    expect(buildQuery('dsl', '{"term":{"a":1}}')).toEqual({ term: { a: 1 } });
  });

  it('reports invalid input as a QueryParseError', () => {
    expect(() => buildQuery('kql', 'status: (')).toThrow(QueryParseError);
    expect(() => buildQuery('dsl', '{not json')).toThrow(QueryParseError);
    expect(() => buildQuery('dsl', '[1]')).toThrow(QueryParseError);
  });
});
