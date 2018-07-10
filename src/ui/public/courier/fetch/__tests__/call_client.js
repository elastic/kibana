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

import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import NoDigestPromises from 'test_utils/no_digest_promises';

import { CallClientProvider } from '../call_client';
import { RequestStatus } from '../req_status';
import { SearchRequestProvider } from '../request';
import { MergeDuplicatesRequestProvider } from '../merge_duplicate_requests';

describe('callClient', () => {
  NoDigestPromises.activateForSuite();

  const ABORTED = RequestStatus.ABORTED;

  let SearchRequest;
  let callClient;
  let fakeSearch;
  let searchRequests;

  const createSearchRequest = (overrides = {}) => {
    // TODO: Spy on handleFailure, whenAborted
    const source = {
      _flatten: () => ({}),
      requestIsStopped: () => {},
    };

    const errorHandler = () => {};

    return new SearchRequest({ source, errorHandler, ...overrides });
  };

  beforeEach(ngMock.module('kibana', PrivateProvider => {
    // We mock this so that we don't need to stub out methods for searchRequest.source, e.g. getId(),
    // which is used by mergeDuplicateRequests.
    function FakeMergeDuplicatesRequestProvider() {
      return function mergeDuplicateRequests(searchRequests) {
        return searchRequests;
      };
    }

    PrivateProvider.swap(MergeDuplicatesRequestProvider, FakeMergeDuplicatesRequestProvider);
  }));

  beforeEach(ngMock.module(function stubEs($provide) {
    $provide.service('es', (Promise) => {
      fakeSearch = sinon.spy(() => {
        return Promise.resolve({
          responses: searchRequests,
        });
      });

      return {
        msearch: fakeSearch,
      };
    });
  }));

  beforeEach(ngMock.inject(Private => {
    callClient = Private(CallClientProvider);
    SearchRequest = Private(SearchRequestProvider);
  }));

  describe('basic contract', () => {
    it('returns a promise', () => {
      searchRequests = [ createSearchRequest() ];
      const callingClient = callClient(searchRequests);
      expect(callingClient.then).to.be.a('function');
    });

    it(`resolves the promise with the 'responses' property of the es.msearch() result`, done => {
      searchRequests = [ createSearchRequest() ];
      const callingClient = callClient(searchRequests);

      callingClient.then(results => {
        // Our es service stub will set the 'responses' property of the result to equal all of
        // the searchRequests we provided to callClient.
        expect(results).to.eql(searchRequests);
        done();
      }).catch(error => done(error));
    });
  });

  describe('implementation', () => {
    it('calls es.msearch() once, regardless of number of searchRequests', done => {
      expect(fakeSearch.callCount).to.be(0);

      searchRequests = [ createSearchRequest(), createSearchRequest(), createSearchRequest() ];
      const callingClient = callClient(searchRequests);

      callingClient.then(() => {
        expect(fakeSearch.callCount).to.be(1);
        done();
      }).catch(error => done(error));
    });
  });

  describe('aborting', () => {
    it(`when searchSource's _flatten method throws an error resolves with an ABORTED response`, done => {
      const searchRequest = createSearchRequest({
        source: {
          _flatten: () => { throw new Error(); },
        },
      });

      searchRequests = [ searchRequest ];
      const callingClient = callClient(searchRequests);

      callingClient.then(results => {
        // The result is ABORTED because it was never included in the body sent to es.msearch().
        expect(results).to.eql([ ABORTED ]);
        done();
      }).catch(error => done(error));
    });

    it('while search params are being fetched resolves with an undefined response', done => {
      const searchRequest = createSearchRequest({
        source: {
          _flatten: () => {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({});
              }, 100);
            });
          },
          requestIsStopped: () => {},
        },
      });

      searchRequests = [ searchRequest ];
      const callingClient = callClient(searchRequests);

      setTimeout(() => {
        searchRequest.abort();
      }, 20);

      callingClient.then(results => {
        expect(results).to.eql([ undefined ]);
        done();
      }).catch(error => done(error));
    });

    it(`all searchRequests resolves with undefined responses`, done => {
      const searchRequest1 = createSearchRequest();
      const searchRequest2 = createSearchRequest();
      searchRequests = [ searchRequest1, searchRequest2 ];
      const callingClient = callClient(searchRequests);
      searchRequest1.abort();
      searchRequest2.abort();

      callingClient.then(results => {
        expect(results).to.eql([undefined, undefined]);
        done();
      }).catch(error => done(error));
    });

    it('one searchRequest but not all of them resolves with full responses', done => {
      const searchRequest1 = createSearchRequest();
      const searchRequest2 = createSearchRequest();
      searchRequests = [ searchRequest1, searchRequest2 ];
      const callingClient = callClient(searchRequests);
      searchRequest2.abort();

      callingClient.then(results => {
        expect(results).to.eql([ searchRequest1, searchRequest2 ]);
        done();
      }).catch(error => done(error));
    });
  });
});
