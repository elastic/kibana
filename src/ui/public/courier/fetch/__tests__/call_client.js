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
import { delay } from 'bluebird';

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
  let esRequestDelay;
  let esShouldError;
  let esPromiseAbortSpy;

  const createSearchRequest = (id, overrides = {}) => {
    const source = {
      _flatten: () => ({}),
      requestIsStopped: () => {},
    };

    const errorHandler = () => {};

    const searchRequest = new SearchRequest({ source, errorHandler, ...overrides });
    searchRequest.__testId__ = id;
    return searchRequest;
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
    esRequestDelay = 0;
    esShouldError = false;

    $provide.service('es', (Promise) => {
      fakeSearch = sinon.spy(() => {
        const esPromise = new Promise((resolve, reject) => {
          if (esShouldError) {
            return reject('fake es error');
          }

          setTimeout(() => {
            resolve({
              responses: searchRequests.map(searchRequest => searchRequest.__testId__),
            });
          }, esRequestDelay);
        });

        esPromise.abort = esPromiseAbortSpy = sinon.spy();
        return esPromise;
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

    it(`resolves the promise with the 'responses' property of the es.msearch() result`, () => {
      searchRequests = [ createSearchRequest(1) ];
      const callingClient = callClient(searchRequests);

      return callingClient.then(results => {
        expect(results).to.eql([1]);
      });
    });
  });

  describe('implementation', () => {
    it('calls es.msearch() once, regardless of number of searchRequests', () => {
      expect(fakeSearch.callCount).to.be(0);

      searchRequests = [ createSearchRequest(), createSearchRequest(), createSearchRequest() ];
      const callingClient = callClient(searchRequests);

      return callingClient.then(() => {
        expect(fakeSearch.callCount).to.be(1);
      });
    });

    it('calls searchRequest.whenAborted() as part of setup', async () => {
      const whenAbortedSpy = sinon.spy();
      const searchRequest = createSearchRequest();
      searchRequest.whenAborted = whenAbortedSpy;
      searchRequests = [ searchRequest ];
      await callClient(searchRequests);
      expect(whenAbortedSpy.callCount).to.be(1);
    });

    it(`calls searchRequest.handleFailure() with the ES error that's thrown`, async () => {
      esShouldError = true;
      const searchRequest = createSearchRequest(1);

      const handleFailureSpy = sinon.spy();
      searchRequest.handleFailure = handleFailureSpy;

      searchRequests = [ searchRequest ];
      await callClient(searchRequests);
      sinon.assert.calledWith(handleFailureSpy, 'fake es error');
    });
  });

  describe('aborting at different points in the request lifecycle:', () => {
    it(`when searchSource's _flatten method throws an error resolves with an ABORTED response`, () => {
      const searchRequest = createSearchRequest(1, {
        source: {
          _flatten: () => { throw new Error(); },
        },
      });

      searchRequests = [ searchRequest ];
      const callingClient = callClient(searchRequests);

      return callingClient.then(results => {
        // The result is ABORTED because it was never included in the body sent to es.msearch().
        expect(results).to.eql([ ABORTED ]);
      });
    });

    it('while the search body is being formed resolves with an ABORTED response', () => {
      const searchRequest = createSearchRequest(1, {
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

      // Abort the request while the search body is being formed.
      setTimeout(() => {
        searchRequest.abort();
      }, 20);

      return callingClient.then(results => {
        expect(results).to.eql([ ABORTED ]);
      });
    });

    it('while the search is in flight resolves with an ABORTED response', () => {
      esRequestDelay = 100;

      const searchRequest = createSearchRequest();
      searchRequests = [ searchRequest ];
      const callingClient = callClient(searchRequests);

      // Abort the request while the search is in flight..
      setTimeout(() => {
        searchRequest.abort();
      }, 80);

      return callingClient.then(results => {
        expect(results).to.eql([ ABORTED ]);
      });
    });
  });

  describe('aborting number of requests:', () => {
    it(`aborting all searchRequests resolves with ABORTED responses`, () => {
      const searchRequest1 = createSearchRequest();
      const searchRequest2 = createSearchRequest();
      searchRequests = [ searchRequest1, searchRequest2 ];
      const callingClient = callClient(searchRequests);

      searchRequest1.abort();
      searchRequest2.abort();

      return callingClient.then(results => {
        expect(results).to.eql([ABORTED, ABORTED]);
      });
    });

    it(`aborting all searchRequests calls abort() on the promise returned by es.msearch()`, () => {
      esRequestDelay = 100;

      const searchRequest1 = createSearchRequest();
      const searchRequest2 = createSearchRequest();
      searchRequests = [ searchRequest1, searchRequest2 ];

      const callingClient = callClient(searchRequests);

      return Promise.all([
        delay(70).then(() => {
          // At this point we expect the request to be in flight.
          expect(esPromiseAbortSpy.callCount).to.be(0);
          searchRequest1.abort();
          searchRequest2.abort();
        }),
        callingClient.then(() => {
          expect(esPromiseAbortSpy.callCount).to.be(1);
        }),
      ]);
    });

    it('aborting some searchRequests resolves those with ABORTED responses', () => {
      const searchRequest1 = createSearchRequest(1);
      const searchRequest2 = createSearchRequest(2);
      searchRequests = [ searchRequest1, searchRequest2 ];
      const callingClient = callClient(searchRequests);
      searchRequest2.abort();

      return callingClient.then(results => {
        expect(results).to.eql([ 1, ABORTED ]);
      });
    });
  });
});
