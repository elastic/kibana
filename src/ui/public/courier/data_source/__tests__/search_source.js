import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

import { requestQueue } from '../../_request_queue';
import { SearchSourceProvider } from '../search_source';
import StubIndexPatternProv from 'test_utils/stub_index_pattern';

function timeout() {
  return new Promise(resolve => {
    setTimeout(resolve);
  });
}

describe('SearchSource', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let config;
  let SearchSource;
  let indexPattern;
  let indexPattern2;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, _config_) {
    config = _config_;
    SearchSource = Private(SearchSourceProvider);

    const IndexPattern = Private(StubIndexPatternProv);
    indexPattern = new IndexPattern('test-*', null, []);
    indexPattern2 = new IndexPattern('test2-*', null, []);
    expect(indexPattern).to.not.be(indexPattern2);
  }));
  beforeEach(requestQueue.clear);
  after(requestQueue.clear);

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

  describe('#onRequestStart()', () => {
    it('should be called when starting a request', async () => {
      const source = new SearchSource();
      const fn = sinon.spy();
      source.onRequestStart(fn);
      const request = {};
      source.requestIsStarting(request);
      await timeout();
      expect(fn.calledWith(source, request)).to.be(true);
    });

    it('should not be called on parent searchSource', async () => {
      const parent = new SearchSource();
      const source = new SearchSource().inherits(parent);

      const fn = sinon.spy();
      source.onRequestStart(fn);
      const parentFn = sinon.spy();
      parent.onRequestStart(parentFn);
      const request = {};
      source.requestIsStarting(request);
      await timeout();
      expect(fn.calledWith(source, request)).to.be(true);
      expect(parentFn.notCalled).to.be(true);
    });

    it('should be called on parent searchSource if callParentStartHandlers is true', async () => {
      const parent = new SearchSource();
      const source = new SearchSource().inherits(parent, { callParentStartHandlers: true });

      const fn = sinon.spy();
      source.onRequestStart(fn);
      const parentFn = sinon.spy();
      parent.onRequestStart(parentFn);
      const request = {};
      source.requestIsStarting(request);
      await timeout();
      expect(fn.calledWith(source, request)).to.be(true);
      expect(parentFn.calledWith(source, request)).to.be(true);
    });
  });

  describe('#_mergeProp', function () {
    describe('filter', function () {
      let source;
      let state;

      beforeEach(function () {
        source = new SearchSource();
        state = {};
      });

      [null, undefined].forEach(falsyValue => {
        it(`ignores ${falsyValue} filter`, function () {
          source._mergeProp(state, falsyValue, 'filter');
          expect(state.filters).to.be(undefined);
        });
      });

      [false, 0, '', NaN].forEach(falsyValue => {
        it(`doesn't add ${falsyValue} filter`, function () {
          source._mergeProp(state, falsyValue, 'filter');
          expect(state.filters).to.be.empty();
        });
      });

      it('adds "meta.disabled: undefined" filter', function () {
        const filter = {
          meta: {}
        };
        source._mergeProp(state, filter, 'filter');
        expect(state.filters).to.eql([filter]);
      });

      it('adds "meta.disabled: false" filter', function () {
        const filter = {
          meta: {
            disabled: false
          }
        };
        source._mergeProp(state, filter, 'filter');
        expect(state.filters).to.eql([filter]);
      });

      it(`doesn't add "meta.disabled: true" filter`, function () {
        const filter = {
          meta: {
            disabled: true
          }
        };
        source._mergeProp(state, filter, 'filter');
        expect(state.filters).to.be.empty();
      });

      describe('when courier:ignoreFilterIfFieldNotInIndex is false', function () {
        it('adds filter for non-existent field', function () {
          config.set('courier:ignoreFilterIfFieldNotInIndex', false);
          const filter = {
            meta: {
              key: 'bar'
            }
          };
          state.index = {
            fields: {
              byName: {}
            }
          };
          source._mergeProp(state, filter, 'filter');
          expect(state.filters).to.eql([ filter ]);
        });
      });

      describe('when courier:ignoreFilterIfFieldNotInIndex is true', function () {
        it(`doesn't add filter for non-existent field`, function () {
          config.set('courier:ignoreFilterIfFieldNotInIndex', true);
          const filter = {
            meta: {
              key: 'bar'
            }
          };
          state.index = {
            fields: {
              byName: {}
            }
          };
          source._mergeProp(state, filter, 'filter');
          expect(state.filters).to.be.empty();
        });

        it(`adds filter for existent field`, function () {
          config.set('courier:ignoreFilterIfFieldNotInIndex', true);
          const filter = {
            meta: {
              key: 'bar'
            }
          };
          state.index = {
            fields: {
              byName: {
                bar: true
              }
            }
          };
          source._mergeProp(state, filter, 'filter');
          expect(state.filters).to.eql([ filter ]);
        });
      });

      it('uses custom filter predicate', function () {
        source.addFilterPredicate(() => {
          return false;
        });

        const filter = {};
        source._mergeProp(state, filter, 'filter');
        expect(state.filters).to.be.empty();
      });
    });
  });
});
