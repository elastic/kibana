import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import { RequestQueueProvider } from '../../_request_queue';
import { SearchSourceProvider } from '../search_source';
import StubIndexPatternProv from 'test_utils/stub_index_pattern';

describe('SearchSource', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let requestQueue;
  let SearchSource;
  let indexPattern;
  let indexPattern2;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    requestQueue = Private(RequestQueueProvider);
    SearchSource = Private(SearchSourceProvider);

    const IndexPattern = Private(StubIndexPatternProv);
    indexPattern = new IndexPattern('test-*', null, []);
    indexPattern2 = new IndexPattern('test2-*', null, []);
    expect(indexPattern).to.not.be(indexPattern2);
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

  describe('#index()', function () {
    describe('auto-sourceFiltering', function () {
      describe('new index pattern assigned', function () {
        it('generates a source filter', function () {
          const source = new SearchSource();
          expect(source.get('index')).to.be(undefined);
          expect(source.get('source')).to.be(undefined);
          source.set('index', indexPattern);
          expect(source.get('index')).to.be(indexPattern);
          expect(source.get('source')).to.be.a('function');
        });

        it('removes created source filter on removal', function () {
          const source = new SearchSource();
          source.set('index', indexPattern);
          source.set('index', null);
          expect(source.get('index')).to.be(undefined);
          expect(source.get('source')).to.be(undefined);
        });
      });

      describe('new index pattern assigned over another', function () {
        it('replaces source filter with new', function () {
          const source = new SearchSource();
          source.set('index', indexPattern);
          const sourceFilter1 = source.get('source');
          source.set('index', indexPattern2);
          expect(source.get('index')).to.be(indexPattern2);
          expect(source.get('source')).to.be.a('function');
          expect(source.get('source')).to.not.be(sourceFilter1);
        });

        it('removes created source filter on removal', function () {
          const source = new SearchSource();
          source.set('index', indexPattern);
          source.set('index', indexPattern2);
          source.set('index', null);
          expect(source.get('index')).to.be(undefined);
          expect(source.get('source')).to.be(undefined);
        });
      });

      describe('ip assigned before custom source filter', function () {
        it('custom source filter becomes new source', function () {
          const source = new SearchSource();
          const football = {};
          source.set('index', indexPattern);
          expect(source.get('source')).to.be.a('function');
          source.set('source', football);
          expect(source.get('index')).to.be(indexPattern);
          expect(source.get('source')).to.be(football);
        });

        it('custom source stays after removal', function () {
          const source = new SearchSource();
          const football = {};
          source.set('index', indexPattern);
          source.set('source', football);
          source.set('index', null);
          expect(source.get('index')).to.be(undefined);
          expect(source.get('source')).to.be(football);
        });
      });

      describe('ip assigned after custom source filter', function () {
        it('leaves the custom filter in place', function () {
          const source = new SearchSource();
          const football = {};
          source.set('source', football);
          source.set('index', indexPattern);
          expect(source.get('index')).to.be(indexPattern);
          expect(source.get('source')).to.be(football);
        });

        it('custom source stays after removal', function () {
          const source = new SearchSource();
          const football = {};
          source.set('source', football);
          source.set('index', indexPattern);
          source.set('index', null);
          expect(source.get('index')).to.be(undefined);
          expect(source.get('source')).to.be(football);
        });
      });
    });
  });
});
