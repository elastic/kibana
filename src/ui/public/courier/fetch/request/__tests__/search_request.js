import ngMock from 'ng_mock';
import sinon from 'sinon';
import expect from 'expect.js';

import { SearchRequestProvider } from '../search_request';
import { requestQueue } from '../../../_request_queue';

describe('ui/courier/fetch search request', () => {
  beforeEach(ngMock.module('kibana'));

  afterEach(() => {
    requestQueue.clear();
  });

  describe('#start()', () => {
    it('calls this.source.requestIsStarting(request)', ngMock.inject((Private) => {
      const SearchReq = Private(SearchRequestProvider);

      const spy = sinon.spy(() => Promise.resolve());
      const source = { requestIsStarting: spy };

      const req = new SearchReq(source);
      expect(req.start()).to.have.property('then').a('function');
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWithExactly(spy, req);
    }));
  });
});
