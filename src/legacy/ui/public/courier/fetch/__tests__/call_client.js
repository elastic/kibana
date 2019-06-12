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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import NoDigestPromises from 'test_utils/no_digest_promises';
import { delay } from 'bluebird';

import { CallClientProvider } from '../call_client';
import { RequestStatus } from '../req_status';
import { SearchRequestProvider } from '../request';
import { addSearchStrategy } from '../../search_strategy';

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

  const createSearchRequest = (id, overrides = {}, errorHandler = () => {}) => {
    const { source: overrideSource, ...rest } = overrides;

    const source = {
      _flatten: () => ({}),
      requestIsStopped: () => {},
      getField: () => 'indexPattern',
      getPreferredSearchStrategyId: () => undefined,
      ...overrideSource
    };

    const searchRequest = new SearchRequest({ source, errorHandler, ...rest });
    searchRequest.__testId__ = id;
    return searchRequest;
  };

  beforeEach(ngMock.module('kibana'));

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

      return callClient(searchRequests).then(results => {
        expect(results).to.eql([1]);
      });
    });

    describe('for failing requests', () => {
      beforeEach(() => {
        addSearchStrategy({
          id: 'fail',
          isViable: indexPattern => {
            return indexPattern.type === 'fail';
          },
          search: () => {
            return {
              searching: Promise.reject(new Error('Search failed')),
              failedSearchRequests: [],
              abort: () => {},
            };
          },
        });
      });

      it(`still bubbles up the failure`, () => {
        const searchRequestFail1 = createSearchRequest('fail1', {
          source: {
            getField: () => ({ type: 'fail' }),
          },
        });

        const searchRequestFail2 = createSearchRequest('fail2', {
          source: {
            getField: () => ({ type: 'fail' }),
          },
        });

        searchRequests = [ searchRequestFail1, searchRequestFail2 ];

        return callClient(searchRequests).then(results => {
          expect(results).to.eql([
            { error: new Error('Search failed') },
            { error: new Error('Search failed') },
          ]);
        });
      });
    });
  });

  describe('implementation', () => {
    it('calls es.msearch() once, regardless of number of searchRequests', () => {
      expect(fakeSearch.callCount).to.be(0);
      searchRequests = [ createSearchRequest(), createSearchRequest(), createSearchRequest() ];

      return callClient(searchRequests).then(() => {
        expect(fakeSearch.callCount).to.be(1);
      });
    });

    it('calls searchRequest.whenAborted() as part of setup', async () => {
      const whenAbortedSpy = sinon.spy();
      const searchRequest = createSearchRequest();
      searchRequest.whenAborted = whenAbortedSpy;
      searchRequests = [ searchRequest ];

      return callClient(searchRequests).then(() => {
        expect(whenAbortedSpy.callCount).to.be(1);
      });
    });
  });

  describe('aborting at different points in the request lifecycle:', () => {

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

    it(`aborting all searchRequests calls abort() on the promise returned by searchStrategy.search()`, () => {
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

  describe('searchRequests with multiple searchStrategies map correctly to their responses', () => {
    const search = ({ searchRequests }) => {
      return {
        searching: Promise.resolve(searchRequests.map(searchRequest => searchRequest.__testId__)),
        failedSearchRequests: [],
        abort: () => {},
      };
    };

    const searchStrategyA = {
      id: 'a',
      isViable: indexPattern => {
        return indexPattern.type === 'a';
      },
      search,
    };

    const searchStrategyB = {
      id: 'b',
      isViable: indexPattern => {
        return indexPattern.type === 'b';
      },
      search,
    };

    let searchRequestA;
    let searchRequestB;
    let searchRequestA2;

    beforeEach(() => {
      addSearchStrategy(searchStrategyA);
      addSearchStrategy(searchStrategyB);

      searchRequestA = createSearchRequest('a', {
        source: {
          getField: () => ({ type: 'a' }),
          getSearchStrategyForSearchRequest: () => {},
          getPreferredSearchStrategyId: () => {},
        },
      });

      searchRequestB = createSearchRequest('b', {
        source: {
          getField: () => ({ type: 'b' }),
          getSearchStrategyForSearchRequest: () => {},
          getPreferredSearchStrategyId: () => {},
        },
      });

      searchRequestA2 = createSearchRequest('a2', {
        source: {
          getField: () => ({ type: 'a' }),
          getSearchStrategyForSearchRequest: () => {},
          getPreferredSearchStrategyId: () => {},
        },
      });
    });

    it('if the searchRequests are reordered by the searchStrategies', () => {
      // Add requests in an order which will be reordered by the strategies.
      searchRequests = [ searchRequestA, searchRequestB, searchRequestA2 ];
      const callingClient = callClient(searchRequests);

      return callingClient.then(results => {
        expect(results).to.eql(['a', 'b', 'a2']);
      });
    });

    it('if one is aborted after being provided', () => {
      // Add requests in an order which will be reordered by the strategies.
      searchRequests = [ searchRequestA, searchRequestB, searchRequestA2 ];
      const callingClient = callClient(searchRequests);
      searchRequestA2.abort();

      return callingClient.then(results => {
        expect(results).to.eql(['a', 'b', ABORTED]);
      });
    });

    it(`if one is already aborted when it's provided`, () => {
      searchRequests = [ searchRequestA, searchRequestB, ABORTED, searchRequestA2 ];
      const callingClient = callClient(searchRequests);

      return callingClient.then(results => {
        expect(results).to.eql(['a', 'b', ABORTED, 'a2']);
      });
    });
  });
});
