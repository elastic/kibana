import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import { requestQueue } from '../_request_queue';

describe('Courier Request Queue', function () {
  beforeEach(ngMock.module('kibana'));
  beforeEach(requestQueue.clear);
  after(requestQueue.clear);

  class MockReq {
    constructor(startable = true) {
      this.source = {};
      this.canStart = sinon.stub().returns(startable);
    }
  }

  describe('#getStartable()', function () {
    it('returns only startable requests', function () {
      requestQueue.push(
        new MockReq(false),
        new MockReq(true)
      );

      expect(requestQueue.getStartable()).to.have.length(1);
    });
  });

  // Note: I'm not convinced this discrepancy between how we calculate startable vs inactive requests makes any sense.
  // I'm only testing here that the current, (very old) code continues to behave how it always did, but it may turn out
  // that we can clean this up, or remove this.
  describe('#getInactive()', function () {
    it('returns only requests with started = false', function () {
      requestQueue.push(
        { started: true },
        { started: false },
        { started: true },
      );

      expect(requestQueue.getInactive()).to.have.length(1);
    });
  });
});
