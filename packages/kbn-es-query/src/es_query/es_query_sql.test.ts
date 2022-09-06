/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  isOfQueryType,
  isOfAggregateQueryType,
  getAggregateQueryMode,
  getIndexPatternFromSQLQuery,
} from './es_query_sql';

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

  describe('getIndexPatternFromSQLQuery', () => {
    it('should return the index pattern string from sql queries', () => {
      const idxPattern1 = getIndexPatternFromSQLQuery('SELECT * FROM foo');
      expect(idxPattern1).toBe('foo');

      const idxPattern2 = getIndexPatternFromSQLQuery('SELECT woof, meow FROM "foo"');
      expect(idxPattern2).toBe('foo');

      const idxPattern3 = getIndexPatternFromSQLQuery('SELECT woof, meow FROM "the_index_pattern"');
      expect(idxPattern3).toBe('the_index_pattern');

      const idxPattern4 = getIndexPatternFromSQLQuery('SELECT woof, meow FROM "the-index-pattern"');
      expect(idxPattern4).toBe('the-index-pattern');

      const idxPattern5 = getIndexPatternFromSQLQuery('SELECT woof, meow from "the-index-pattern"');
      expect(idxPattern5).toBe('the-index-pattern');

      const idxPattern6 = getIndexPatternFromSQLQuery('SELECT woof, meow from "logstash-*"');
      expect(idxPattern6).toBe('logstash-*');

      const idxPattern7 = getIndexPatternFromSQLQuery(
        'SELECT woof, meow from logstash-1234! WHERE field > 100'
      );
      expect(idxPattern7).toBe('logstash-1234!');

      const idxPattern8 = getIndexPatternFromSQLQuery(
        'SELECT * FROM (SELECT woof, miaou FROM "logstash-1234!" GROUP BY woof)'
      );
      expect(idxPattern8).toBe('logstash-1234!');
    });
  });
});
