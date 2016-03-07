import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

import RequestQueueProv from '../../_request_queue';
import SearchSourceProv from '../search_source';

describe('SearchSource', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let requestQueue;
  let SearchSource;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    requestQueue = Private(RequestQueueProv);
    SearchSource = Private(SearchSourceProv);
  }));

  describe('#onResults()', function () {
    it('adds a request to the requestQueue', function () {
      const source = new SearchSource();

      expect(requestQueue).to.have.length(0);
      source.onResults();
      expect(requestQueue).to.have.length(1);
    });

    it('returns a promise that is resolved with the results', function () {
      const source = new SearchSource();
      const fakeResults = {};

      const promise = source.onResults().then((results) => {
        expect(results).to.be(fakeResults);
      });

      requestQueue[0].defer.resolve(fakeResults);
      return promise;
    });
  });

  describe('#destroy()', function () {
    it('aborts all startable requests', function () {
      const source = new SearchSource();
      source.onResults();
      sinon.stub(requestQueue[0], 'canStart').returns(true);
      source.destroy();
      expect(requestQueue).to.have.length(0);
    });

    it('aborts all non-startable requests', function () {
      const source = new SearchSource();
      source.onResults();
      sinon.stub(requestQueue[0], 'canStart').returns(false);
      source.destroy();
      expect(requestQueue).to.have.length(0);
    });
  });
});
