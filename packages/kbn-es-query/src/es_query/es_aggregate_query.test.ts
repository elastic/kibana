/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isOfQueryType, isOfAggregateQueryType, getAggregateQueryMode } from './es_aggregate_query';

describe('sql query helpers', () => {
  describe('isOfQueryType', () => {
    it('should return true for a Query type query', () => {
      const flag = isOfQueryType({ query: 'foo', language: 'test' });
      expect(flag).toBe(true);
    });

    it('should return false for an Aggregate type query', () => {
      const flag = isOfQueryType({ sql: 'SELECT * FROM foo' });
      expect(flag).toBe(false);
    });
  });

  describe('isOfAggregateQueryType', () => {
    it('should return false for a Query type query', () => {
      const flag = isOfAggregateQueryType({ query: 'foo', language: 'test' });
      expect(flag).toBe(false);
    });

    it('should return false for an undefined query', () => {
      const flag = isOfAggregateQueryType(undefined);
      expect(flag).toBe(false);
    });

    it('should return true for an Aggregate type query', () => {
      const flag = isOfAggregateQueryType({ sql: 'SELECT * FROM foo' });
      expect(flag).toBe(true);
    });
  });

  describe('getAggregateQueryMode', () => {
    it('should return sql for an SQL AggregateQuery type', () => {
      const mode = getAggregateQueryMode({ sql: 'SELECT * FROM foo' });
      expect(mode).toBe('sql');
    });

    it('should return esql for an ESQL AggregateQuery type', () => {
      const mode = getAggregateQueryMode({ esql: 'foo | where field > 100' });
      expect(mode).toBe('esql');
    });
  });
});
