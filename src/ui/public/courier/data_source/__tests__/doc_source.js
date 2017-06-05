import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import { RequestQueueProvider } from '../../_request_queue';
import { DocSourceProvider } from '../doc_source';

describe('DocSource', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let requestQueue;
  let DocSource;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    requestQueue = Private(RequestQueueProvider);
    DocSource = Private(DocSourceProvider);
  }));

  describe('#onUpdate()', function () {
    it('adds a request to the requestQueue', function () {
      const source = new DocSource();

      expect(requestQueue).to.have.length(0);
      source.onUpdate();
      expect(requestQueue).to.have.length(1);
    });

    it('returns a promise that is resolved with the results', function () {
      const source = new DocSource();
      const fakeResults = {};

      const promise = source.onUpdate().then((results) => {
        expect(results).to.be(fakeResults);
      });

      requestQueue[0].defer.resolve(fakeResults);
      return promise;
    });
  });

  describe('#destroy()', function () {
    it('aborts all startable requests', function () {
      const source = new DocSource();
      source.onUpdate();
      sinon.stub(requestQueue[0], 'canStart').returns(true);
      source.destroy();
      expect(requestQueue).to.have.length(0);
    });

    it('aborts all non-startable requests', function () {
      const source = new DocSource();
      source.onUpdate();
      sinon.stub(requestQueue[0], 'canStart').returns(false);
      source.destroy();
      expect(requestQueue).to.have.length(0);
    });
  });
});
