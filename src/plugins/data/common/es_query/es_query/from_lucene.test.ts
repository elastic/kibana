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

import { buildQueryFromLucene } from './from_lucene';
import { decorateQuery } from './decorate_query';
import { luceneStringToDsl } from './lucene_string_to_dsl';
import { Query } from '../../query/types';

describe('build query', () => {
  describe('buildQueryFromLucene', () => {
    test('should return the parameters of an Elasticsearch bool query', () => {
      const result = buildQueryFromLucene([], {});
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };

      expect(result).toEqual(expected);
    });

    test("should transform an array of lucene queries into ES queries combined in the bool's must clause", () => {
      const queries = ([
        { query: 'foo:bar', language: 'lucene' },
        { query: 'bar:baz', language: 'lucene' },
      ] as unknown) as Query[];
      const expectedESQueries = queries.map(query => {
        return decorateQuery(luceneStringToDsl(query.query), {});
      });

      const result = buildQueryFromLucene(queries, {});

      expect(result.must).toEqual(expectedESQueries);
    });

    test('should also accept queries in ES query DSL format, simply passing them through', () => {
      const queries = ([{ query: { match_all: {} }, language: 'lucene' }] as unknown) as Query[];
      const result = buildQueryFromLucene(queries, {});

      expect(result.must).toEqual([queries[0].query]);
    });
  });

  test("should accept a date format in the decorated queries and combine that into the bool's must clause", () => {
    const queries = ([
      { query: 'foo:bar', language: 'lucene' },
      { query: 'bar:baz', language: 'lucene' },
    ] as unknown) as Query[];
    const dateFormatTZ = 'America/Phoenix';
    const expectedESQueries = queries.map(query => {
      return decorateQuery(luceneStringToDsl(query.query), {}, dateFormatTZ);
    });
    const result = buildQueryFromLucene(queries, {}, dateFormatTZ);

    expect(result.must).toEqual(expectedESQueries);
  });
});
