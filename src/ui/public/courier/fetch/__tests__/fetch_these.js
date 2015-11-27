describe('ui/courier/fetch/_fetch_these', () => {
  const _ = require('lodash');
  const sinon = require('auto-release-sinon');
  const expect = require('expect.js');
  const ngMock = require('ngMock');

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

    PrivateProvider.swap(require('ui/courier/fetch/_call_client'), FakeResponsesProvider);
    PrivateProvider.swap(require('ui/courier/fetch/_call_response_handlers'), FakeResponsesProvider);
    PrivateProvider.swap(require('ui/courier/fetch/_continue_incomplete'), FakeResponsesProvider);
  }));

  beforeEach(ngMock.inject((Private, $injector) => {
    $rootScope = $injector.get('$rootScope');
    Promise = $injector.get('Promise');
    fetchThese = Private(require('ui/courier/fetch/_fetch_these'));
    request = mockRequest();
    requests = [ request ];
  }));

  context('when request has not started', () => {
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
  });

  context('when request has already started', () => {
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
  });

  function mockRequest() {
    return {
      strategy: 'mock',
      started: true,
      aborted: false,
      retry: sinon.spy(function () { return this; }),
      continue: sinon.spy(function () { return this; }),
      start: sinon.spy(function () { return this; })
    };
  }
});
