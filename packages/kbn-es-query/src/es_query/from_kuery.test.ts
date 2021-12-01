/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildQueryFromKuery } from './from_kuery';
import { fromKueryExpression, toElasticsearchQuery } from '../kuery';
import { fields } from '../filters/stubs';
import { DataViewBase } from './types';
import { Query } from '..';

jest.mock('../kuery/grammar');

describe('build query', () => {
  const indexPattern: DataViewBase = {
    fields,
    title: 'dataView',
  };

  describe('buildQueryFromKuery', () => {
    test('should return the parameters of an Elasticsearch bool query', () => {
      const result = buildQueryFromKuery(undefined, [], true);
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };
      expect(result).toEqual(expected);
    });

    test("should transform an array of kuery queries into ES queries combined in the bool's filter clause", () => {
      const queries = [
        { query: 'extension:jpg', language: 'kuery' },
        { query: 'machine.os:osx', language: 'kuery' },
      ] as Query[];

      const expectedESQueries = queries.map((query) => {
        return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
      });

      const result = buildQueryFromKuery(indexPattern, queries, true);

      expect(result.filter).toEqual(expectedESQueries);
    });

    test("should accept a specific date format for a kuery query into an ES query in the bool's filter clause", () => {
      const queries = [{ query: '@timestamp:"2018-04-03T19:04:17"', language: 'kuery' }] as Query[];
      const expectedESQueries = queries.map((query) => {
        return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern, {
          dateFormatTZ: 'America/Phoenix',
        });
      });

      const result = buildQueryFromKuery(indexPattern, queries, true, 'America/Phoenix');

      expect(result.filter).toEqual(expectedESQueries);
    });

    test('should gracefully handle date queries when no date format is provided', () => {
      const queries = [
        { query: '@timestamp:"2018-04-03T19:04:17Z"', language: 'kuery' },
      ] as Query[];
      const expectedESQueries = queries.map((query) => {
        return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
      });

      const result = buildQueryFromKuery(indexPattern, queries, true);

      expect(result.filter).toEqual(expectedESQueries);
    });
  });
});
