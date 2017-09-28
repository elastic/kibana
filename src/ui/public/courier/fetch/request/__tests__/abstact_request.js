import ngMock from 'ng_mock';
import sinon from 'sinon';

import { AbstractRequestProvider } from '../request';
import { requestQueue } from '../../../_request_queue';

describe('courier/fetch abstract request', () => {
  beforeEach(ngMock.module('kibana'));

  afterEach(() => {
    requestQueue.clear();
  });

  describe('#start()', () => {
    it('calls this.source.requestIsStarting(request)', ngMock.inject((Private) => {
      const AbstractReq = Private(AbstractRequestProvider);

      const spy = sinon.spy(() => Promise.resolve());
      const source = { requestIsStarting: spy };

      const req = new AbstractReq(source);
      expect(req.start()).to.have.property('then').a('function');
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWithExactly(spy, req);
    }));
  });
});
