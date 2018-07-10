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
import { IsRequestProvider } from '../is_request';
import { MergeDuplicatesRequestProvider } from '../merge_duplicate_requests';

function mockRequest() {
  return {
    strategy: 'mock',
    started: true,
    aborted: false,
    handleFailure: sinon.spy(),
    retry: sinon.spy(function () { return this; }),
    continue: sinon.spy(function () { return this; }),
    start: sinon.spy(function () { return this; }),
    getFetchParams: () => ({}),
    source: {},
    erroHandler: () => {},
    whenAborted: () => {}, // TODO: Test this
  };
}

describe('callClient', () => {
  NoDigestPromises.activateForSuite();

  let callClient;
  let fakeSearch;
  let searchRequests;

  beforeEach(ngMock.module('kibana', PrivateProvider => {
    function FakeIsRequestProvider() {
      return function isRequest() {
        return true;
      };
    }

    PrivateProvider.swap(IsRequestProvider, FakeIsRequestProvider);

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
  }));

  describe('basic contract', () => {
    it('returns a promise', () => {
      searchRequests = [ mockRequest() ];
      const callingClient = callClient(searchRequests);
      expect(callingClient.then).to.be.a('function');
    });

    it('calls es.msearch() once, regardless of a large number of searchRequests', done => {
      expect(fakeSearch.callCount).to.be(0);

      searchRequests = [ mockRequest(), mockRequest(), mockRequest(), mockRequest() ];
      const callingClient = callClient(searchRequests);

      callingClient.then(() => {
        expect(fakeSearch.callCount).to.be(1);
        done();
      });
    });

    it(`resolves the promise with the 'responses' property of the es.msearch() result`, done => {
      searchRequests = [ mockRequest() ];
      const callingClient = callClient(searchRequests);

      callingClient.then(results => {
        // Our es service stub will set the 'responses' property of the result to equal all of
        // the searchRequests we provided to callClient.
        expect(results).to.eql(searchRequests);
        done();
      });
    });

  });
});
