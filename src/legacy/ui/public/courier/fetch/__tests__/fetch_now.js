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

import { CallClientProvider } from '../call_client';
import { CallResponseHandlersProvider } from '../call_response_handlers';
import { ContinueIncompleteProvider } from '../continue_incomplete';
import { FetchNowProvider } from '../fetch_now';

function mockRequest() {
  return {
    strategy: 'mock',
    started: true,
    aborted: false,
    handleFailure: sinon.spy(),
    retry: sinon.spy(function () { return this; }),
    continue: sinon.spy(function () { return this; }),
    start: sinon.spy(function () { return this; })
  };
}

describe('FetchNowProvider', () => {

  let Promise;
  let $rootScope;
  let fetchNow;
  let request;
  let requests;
  let fakeResponses;

  beforeEach(ngMock.module('kibana', (PrivateProvider) => {
    function FakeResponsesProvider(Promise) {
      fakeResponses = sinon.spy(function () {
        return Promise.map(requests, mockRequest => {
          return { mockRequest };
        });
      });
      return fakeResponses;
    }

    PrivateProvider.swap(CallClientProvider, FakeResponsesProvider);
    PrivateProvider.swap(CallResponseHandlersProvider, FakeResponsesProvider);
    PrivateProvider.swap(ContinueIncompleteProvider, FakeResponsesProvider);
  }));

  beforeEach(ngMock.inject((Private, $injector) => {
    $rootScope = $injector.get('$rootScope');
    Promise = $injector.get('Promise');
    fetchNow = Private(FetchNowProvider);
    request = mockRequest();
    requests = [ request ];
  }));

  describe('when request has not started', () => {
    beforeEach(() => requests.forEach(req => req.started = false));

    it('starts request', () => {
      fetchNow(requests);
      expect(request.start.called).to.be(true);
      expect(request.continue.called).to.be(false);
    });

    it('waits for returned promise from start() to be fulfilled', () => {
      request.start = sinon.stub().returns(Promise.resolve(request));
      fetchNow(requests);

      expect(request.start.callCount).to.be(1);
      expect(fakeResponses.callCount).to.be(0);
      $rootScope.$apply();
      expect(fakeResponses.callCount).to.be(3);
    });

    it('invokes request failure handler if starting fails', () => {
      request.start = sinon.stub().returns(Promise.reject('some error'));
      fetchNow(requests);
      $rootScope.$apply();
      sinon.assert.calledWith(request.handleFailure, 'some error');
    });
  });

  describe('when request has already started', () => {
    it('continues request', () => {
      fetchNow(requests);
      expect(request.start.called).to.be(false);
      expect(request.continue.called).to.be(true);
    });
    it('waits for returned promise to be fulfilled', () => {
      request.continue = sinon.stub().returns(Promise.resolve(request));
      fetchNow(requests);

      expect(request.continue.callCount).to.be(1);
      expect(fakeResponses.callCount).to.be(0);
      $rootScope.$apply();
      expect(fakeResponses.callCount).to.be(3);
    });
    it('invokes request failure handler if continuing fails', () => {
      request.continue = sinon.stub().returns(Promise.reject('some error'));
      fetchNow(requests);
      $rootScope.$apply();
      sinon.assert.calledWith(request.handleFailure, 'some error');
    });
  });
});
