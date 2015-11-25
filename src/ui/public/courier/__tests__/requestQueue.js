import ngMock from 'ngMock';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

import RequestQueueProv from '../_request_queue';
import SearchStrategyProv from '../fetch/strategy/search';
import DocStrategyProv from '../fetch/strategy/doc';

describe('Courier Request Queue', function () {
  let docStrategy;
  let requestQueue;
  let searchStrategy;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    docStrategy = Private(DocStrategyProv);
    requestQueue = Private(RequestQueueProv);
    searchStrategy = Private(SearchStrategyProv);
  }));

  class MockReq {
    constructor(strategy, startable = true) {
      this.strategy = strategy;
      this.source = {};
      this.canStart = sinon.stub().returns(startable);
    }
  }

  describe('#getStartable(strategy)', function () {
    it('only returns requests that match one of the passed strategies', function () {
      requestQueue.push(
        new MockReq(docStrategy),
        new MockReq(searchStrategy),
        new MockReq(searchStrategy),
        new MockReq(searchStrategy)
      );

      expect(requestQueue.getStartable(docStrategy)).to.have.length(1);
      expect(requestQueue.getStartable(searchStrategy)).to.have.length(3);
    });

    it('returns all requests when no strategy passed', function () {
      requestQueue.push(
        new MockReq(docStrategy),
        new MockReq(searchStrategy)
      );

      expect(requestQueue.getStartable()).to.have.length(2);
    });

    it('returns only startable requests', function () {
      requestQueue.push(
        new MockReq(docStrategy, true),
        new MockReq(searchStrategy, false)
      );

      expect(requestQueue.getStartable()).to.have.length(1);
    });
  });

  describe('#get(strategy)', function () {
    it('only returns requests that match one of the passed strategies', function () {
      requestQueue.push(
        new MockReq(docStrategy),
        new MockReq(searchStrategy),
        new MockReq(searchStrategy),
        new MockReq(searchStrategy)
      );

      expect(requestQueue.get(docStrategy)).to.have.length(1);
      expect(requestQueue.get(searchStrategy)).to.have.length(3);
    });

    it('returns all requests when no strategy passed', function () {
      requestQueue.push(
        new MockReq(docStrategy),
        new MockReq(searchStrategy)
      );

      expect(requestQueue.get()).to.have.length(2);
    });

    it('returns startable and not-startable requests', function () {
      requestQueue.push(
        new MockReq(docStrategy, true),
        new MockReq(searchStrategy, false)
      );

      expect(requestQueue.get()).to.have.length(2);
    });
  });
});
