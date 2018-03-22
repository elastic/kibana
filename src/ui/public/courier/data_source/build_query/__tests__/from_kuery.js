import { buildQueryFromKuery } from '../from_kuery';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { expectDeepEqual } from '../../../../../../test_utils/expect_deep_equal.js';
import expect from 'expect.js';
import { fromKueryExpression, toElasticsearchQuery } from '../../../../kuery';

let indexPattern;

describe('build query', function () {
  const configStub = { get: () => true };

  describe('buildQueryFromKuery', function () {

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPatternProvider);
    }));

    it('should return the parameters of an Elasticsearch bool query', function () {
      const result = buildQueryFromKuery(null, [], configStub);
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
        { query: 'extension:jpg', language: 'kuery' },
        { query: 'machine.os:osx', language: 'kuery' },
      ];

      const expectedESQueries = queries.map(
        (query) => {
          return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
        }
      );

      const result = buildQueryFromKuery(indexPattern, queries, configStub);

      expectDeepEqual(result.filter, expectedESQueries);
    });

    it('should throw a useful error if it looks like query is using an old, unsupported syntax', function () {
      const oldQuery = { query: 'is(foo, bar)', language: 'kuery' };

      expect(buildQueryFromKuery).withArgs(indexPattern, [oldQuery], configStub).to.throwError(
        /It looks like you're using an outdated Kuery syntax./
      );
    });

  });

});
