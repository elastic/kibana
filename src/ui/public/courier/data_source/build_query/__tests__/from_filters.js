import { buildQueryFromFilters } from '../from_filters';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../../test_utils/expect_deep_equal.js';

describe('build query', function () {
  describe('buildQueryFromFilters', function () {
    beforeEach(ngMock.module('kibana'));

    it('should return the parameters of an Elasticsearch bool query', function () {
      const result = buildQueryFromFilters([]);
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };
      expectDeepEqual(result, expected);
    });

    it('should transform an array of kibana filters into ES queries combined in the bool clauses', function () {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all' },
        },
        {
          exists: { field: 'foo' },
          meta: { type: 'exists' },
        },
      ];

      const expectedESQueries = [
        { match_all: {} },
        { exists: { field: 'foo' } },
      ];

      const result = buildQueryFromFilters(filters);

      expectDeepEqual(result.must, expectedESQueries);
    });

    it('should place negated filters in the must_not clause', function () {
      const filters = [
        {
          match_all: {},
          meta: { type: 'match_all', negate: true },
        },
      ];

      const expectedESQueries = [{ match_all: {} }];

      const result = buildQueryFromFilters(filters);

      expectDeepEqual(result.must_not, expectedESQueries);
    });

    it('should translate old ES filter syntax into ES 5+ query objects', function () {
      const filters = [
        {
          query: { exists: { field: 'foo' } },
          meta: { type: 'exists' },
        },
      ];

      const expectedESQueries = [
        {
          exists: { field: 'foo' },
        },
      ];

      const result = buildQueryFromFilters(filters);

      expectDeepEqual(result.must, expectedESQueries);
    });

    it('should migrate deprecated match syntax', function () {
      const filters = [
        {
          query: { match: { extension: { query: 'foo', type: 'phrase' } } },
          meta: { type: 'phrase' },
        },
      ];

      const expectedESQueries = [
        {
          match_phrase: { extension: { query: 'foo' } },
        },
      ];

      const result = buildQueryFromFilters(filters);

      expectDeepEqual(result.must, expectedESQueries);
    });

    it('should not add query:queryString:options to query_string filters', function () {
      const filters = [
        {
          query: { query_string: { query: 'foo' } },
          meta: { type: 'query_string' },
        },
      ];
      const expectedESQueries = [{ query_string: { query: 'foo' } }];

      const result = buildQueryFromFilters(filters);

      expectDeepEqual(result.must, expectedESQueries);
    });
  });
});
