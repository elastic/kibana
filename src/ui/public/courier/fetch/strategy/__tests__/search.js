import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import { SearchStrategyProvider } from '../search';
import StubIndexPatternProvider from 'test_utils/stub_index_pattern';

describe('SearchStrategyProvider', () => {
  require('test_utils/no_digest_promises').activateForSuite();

  let search;
  let reqsFetchParams;
  let IndexPattern;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private) => {
    search = Private(SearchStrategyProvider);
    IndexPattern = Private(StubIndexPatternProvider);

    reqsFetchParams = [
      {
        index: ['logstash-123'],
        type: 'blah',
        search_type: 'blah2',
        body: { foo: 'bar', $foo: 'bar' }
      }
    ];
  }));

  describe('#clientMethod', () => {
    it('is msearch', () => {
      expect(search.clientMethod).to.equal('msearch');
    });
  });

  describe('#reqsFetchParamsToBody()', () => {
    it('filters out any body properties that begin with $', () => {
      return search.reqsFetchParamsToBody(reqsFetchParams).then(value => {
        expect(_.includes(value, 'foo')).to.be(true);
        expect(_.includes(value, '$foo')).to.be(false);
      });
    });

    describe('when indexList is not empty', () => {
      it('includes the index', () => {
        return search.reqsFetchParamsToBody(reqsFetchParams).then(value => {
          expect(_.includes(value, '"index":["logstash-123"]')).to.be(true);
        });
      });
    });

    describe('when indexList is empty', () => {
      beforeEach(() => {
        reqsFetchParams.forEach(request => request.index = []);
      });
      const emptyMustNotQuery = JSON.stringify({
        query: {
          bool: {
            must_not: [
              { match_all: {} }
            ]
          }
        }
      });

      it('queries the kibana index (.kibana) with a must_not match_all boolean', () => {
        return search.reqsFetchParamsToBody(reqsFetchParams).then(value => {
          expect(_.includes(value, '"index":[".kibana"]')).to.be(true);
          expect(_.includes(value, emptyMustNotQuery)).to.be(true);
        });
      });
    });

    describe('when passed IndexPatterns', () => {
      it(' that are out of range, queries .kibana', () => {
        // Check out https://github.com/elastic/kibana/issues/10905 for the reasons behind this
        // test. When an IndexPattern is out of time range, it returns an array that is then stored in a cache.  This
        // cached object was being modified in a following function, which was a subtle side affect - it looked like
        // only a local change.
        const indexPattern = new IndexPattern('logstash-*', null, []);
        // Stub the call so it looks like the request returns an empty list, which will happen if the time range
        // selected doesn't contain any data for the particular index.
        indexPattern.toIndexList = () => Promise.resolve([]);
        const reqsFetchParams = [
          {
            index: indexPattern,
            type: 'planet',
            search_type: 'water',
            body: { foo: 'earth' }
          },
          {
            index: indexPattern,
            type: 'planet',
            search_type: 'rings',
            body: { foo: 'saturn' }
          }
        ];
        return search.reqsFetchParamsToBody(reqsFetchParams).then(value => {
          const indexLineMatch = value.match(/"index":\[".kibana"\]/g);
          expect(indexLineMatch).to.not.be(null);
          expect(indexLineMatch.length).to.be(2);
          const queryLineMatch = value.match(/"query":\{"bool":\{"must_not":\[\{"match_all":\{\}\}\]\}\}/g);
          expect(queryLineMatch).to.not.be(null);
          expect(queryLineMatch.length).to.be(2);
        });
      });
    });
  });

  describe('#getResponses()', () => {
    it('returns the `responses` property of the given arg', () => {
      const responses = [{}];
      const returned = search.getResponses({ responses });
      expect(returned).to.be(responses);
    });
  });
});
