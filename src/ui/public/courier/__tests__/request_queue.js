import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import { requestQueue } from '../_request_queue';
import { SearchStrategyProvider } from '../fetch/strategy/search';

describe('Courier Request Queue', function () {
  let searchStrategy;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {

    searchStrategy = Private(SearchStrategyProvider);
  }));
  beforeEach(requestQueue.clear);
  after(requestQueue.clear);

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
        new MockReq(searchStrategy),
        new MockReq(searchStrategy),
        new MockReq(searchStrategy)
      );

      expect(requestQueue.getStartable(searchStrategy)).to.have.length(3);
    });

    it('returns all requests when no strategy passed', function () {
      requestQueue.push(
        new MockReq(searchStrategy)
      );

      expect(requestQueue.getStartable()).to.have.length(1);
    });

    it('returns only startable requests', function () {
      requestQueue.push(
        new MockReq(searchStrategy, false),
        new MockReq(searchStrategy, true)
      );

      expect(requestQueue.getStartable()).to.have.length(1);
    });
  });

  describe('#get(strategy)', function () {
    it('only returns requests that match one of the passed strategies', function () {
      requestQueue.push(
        new MockReq(searchStrategy),
        new MockReq(searchStrategy),
        new MockReq(searchStrategy)
      );

      expect(requestQueue.get(searchStrategy)).to.have.length(3);
    });

    it('returns all requests when no strategy passed', function () {
      requestQueue.push(
        new MockReq(searchStrategy)
      );

      expect(requestQueue.get()).to.have.length(1);
    });

    it('returns startable and not-startable requests', function () {
      requestQueue.push(
        new MockReq(searchStrategy, true),
        new MockReq(searchStrategy, false)
      );

      expect(requestQueue.get()).to.have.length(2);
    });
  });
});
