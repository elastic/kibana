import { buildQueryFromLucene } from '../from_lucene';
import { DecorateQueryProvider } from '../../_decorate_query.js';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../../test_utils/expect_deep_equal.js';
import { luceneStringToDsl } from '../lucene_string_to_dsl';

let decorateQuery;

describe('build query', function () {

  describe('buildQueryFromLucene', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      decorateQuery = Private(DecorateQueryProvider);
    }));

    it('should return the parameters of an Elasticsearch bool query', function () {
      const result = buildQueryFromLucene();
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };
      expectDeepEqual(result, expected);
    });

    it('should transform an array of lucene queries into ES queries combined in the bool\'s must clause', function () {
      const queries = [
        { query: 'foo:bar', language: 'lucene' },
        { query: 'bar:baz', language: 'lucene' },
      ];

      const expectedESQueries = queries.map(
        (query) => {
          return decorateQuery(luceneStringToDsl(query.query));
        }
      );

      const result = buildQueryFromLucene(queries, decorateQuery);

      expectDeepEqual(result.must, expectedESQueries);
    });

    it('should also accept queries in ES query DSL format, simply passing them through', function () {
      const queries = [
        { query: { match_all: {} }, language: 'lucene' },
      ];

      const result = buildQueryFromLucene(queries, decorateQuery);

      expectDeepEqual(result.must, [queries[0].query]);
    });

  });

});
