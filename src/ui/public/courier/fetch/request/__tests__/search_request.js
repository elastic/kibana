import ngMock from 'ng_mock';
import sinon from 'sinon';
import expect from 'expect.js';

import { SearchRequestProvider } from '../search';

describe('ui/courier/fetch search request', () => {
  beforeEach(ngMock.module('kibana'));

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
