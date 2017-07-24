import { buildQueryFromKuery } from '../from_kuery';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../../test_utils/expect_deep_equal.js';
import { fromKueryExpression, toElasticsearchQuery } from '../../../../kuery';

let indexPattern;

describe('build query', function () {

  describe('buildQueryFromKuery', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    it('should return the parameters of an Elasticsearch bool query', function () {
      const result = buildQueryFromKuery();
      const expected = {
        must: [],
        filter: [],
        should: [],
        must_not: [],
      };
      expectDeepEqual(result, expected);
    });

    it('should transform an array of kuery queries into ES queries combined in the bool\'s filter clause', function () {
      const queries = [
        { query: 'foo:bar', language: 'kuery' },
        { query: 'bar:baz', language: 'kuery' },
      ];

      const expectedESQueries = queries.map(
        (query) => {
          return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
        }
      );

      const result = buildQueryFromKuery(indexPattern, queries);

      expectDeepEqual(result.filter, expectedESQueries);
    });

  });

});
