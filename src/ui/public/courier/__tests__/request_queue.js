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
});
