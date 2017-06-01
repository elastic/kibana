import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import { CallClientProvider } from 'ui/courier/fetch/call_client';
import { CallResponseHandlersProvider } from 'ui/courier/fetch/call_response_handlers';
import { ContinueIncompleteProvider } from 'ui/courier/fetch/continue_incomplete';
import { FetchTheseProvider } from '../fetch_these';

describe('FetchTheseProvider', () => {

  let Promise;
  let $rootScope;
  let fetchThese;
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
    fetchThese = Private(FetchTheseProvider);
    request = mockRequest();
    requests = [ request ];
  }));

  describe('when request has not started', () => {
    beforeEach(() => requests.forEach(req => req.started = false));

    it('starts request', () => {
      fetchThese(requests);
      expect(request.start.called).to.be(true);
      expect(request.continue.called).to.be(false);
    });

    it('waits for returned promise from start() to be fulfilled', () => {
      request.start = sinon.stub().returns(Promise.resolve(request));
      fetchThese(requests);

      expect(request.start.callCount).to.be(1);
      expect(fakeResponses.callCount).to.be(0);
      $rootScope.$apply();
      expect(fakeResponses.callCount).to.be(3);
    });

    it('invokes request failure handler if starting fails', () => {
      request.start = sinon.stub().returns(Promise.reject('some error'));
      fetchThese(requests);
      $rootScope.$apply();
      sinon.assert.calledWith(request.handleFailure, 'some error');
    });
  });

  describe('when request has already started', () => {
    it('continues request', () => {
      fetchThese(requests);
      expect(request.start.called).to.be(false);
      expect(request.continue.called).to.be(true);
    });
    it('waits for returned promise to be fulfilled', () => {
      request.continue = sinon.stub().returns(Promise.resolve(request));
      fetchThese(requests);

      expect(request.continue.callCount).to.be(1);
      expect(fakeResponses.callCount).to.be(0);
      $rootScope.$apply();
      expect(fakeResponses.callCount).to.be(3);
    });
    it('invokes request failure handler if continuing fails', () => {
      request.continue = sinon.stub().returns(Promise.reject('some error'));
      fetchThese(requests);
      $rootScope.$apply();
      sinon.assert.calledWith(request.handleFailure, 'some error');
    });
  });

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
});
