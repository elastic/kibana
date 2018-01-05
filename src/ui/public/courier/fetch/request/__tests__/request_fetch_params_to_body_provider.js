import ngMock from 'ng_mock';
import expect from 'expect.js';

import StubIndexPatternProvider from 'test_utils/stub_index_pattern';

import { RequestFetchParamsToBodyProvider } from '../request_fetch_params_to_body_provider';

describe('RequestFetchParamsToBodyProvider', () => {
  let requestFetchParamsToBody;
  let IndexPattern;

  require('test_utils/no_digest_promises').activateForSuite();

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private) => {
    requestFetchParamsToBody = Private(RequestFetchParamsToBodyProvider);
    IndexPattern = Private(StubIndexPatternProvider);
  }));

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
      return requestFetchParamsToBody(reqsFetchParams).then(value => {
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
