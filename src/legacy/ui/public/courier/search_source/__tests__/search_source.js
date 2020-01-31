/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import sinon from 'sinon';

import { searchRequestQueue } from '../../search_request_queue';
import { SearchSourceProvider } from '../search_source';
import StubIndexPattern from 'test_utils/stub_index_pattern';

function timeout() {
  return new Promise(resolve => {
    setTimeout(resolve);
  });
}

describe('SearchSource', function() {
  require('test_utils/no_digest_promises').activateForSuite();

  let config;
  let SearchSource;
  let indexPattern;
  let indexPattern2;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(Private, _config_) {
      config = _config_;
      SearchSource = Private(SearchSourceProvider);

      indexPattern = new StubIndexPattern('test-*', cfg => cfg, null, []);
      indexPattern2 = new StubIndexPattern('test2-*', cfg => cfg, null, []);
      expect(indexPattern).to.not.be(indexPattern2);
    })
  );
  beforeEach(() => searchRequestQueue.removeAll());
  after(() => searchRequestQueue.removeAll());

  describe('#onResults()', function() {
    it('adds a request to the searchRequestQueue', function() {
      const searchSource = new SearchSource();

      expect(searchRequestQueue.getCount()).to.be(0);
      searchSource.onResults();
      expect(searchRequestQueue.getCount()).to.be(1);
    });

    it('returns a promise that is resolved with the results', function() {
      const searchSource = new SearchSource();
      const fakeResults = {};

      const promise = searchSource.onResults().then(results => {
        expect(results).to.be(fakeResults);
      });

      const searchRequest = searchRequestQueue.getSearchRequestAt(0);
      searchRequest.defer.resolve(fakeResults);
      return promise;
    });
  });

  describe('#destroy()', function() {
    it('aborts all startable requests', function() {
      const searchSource = new SearchSource();
      searchSource.onResults();
      const searchRequest = searchRequestQueue.getSearchRequestAt(0);
      sinon.stub(searchRequest, 'canStart').returns(true);
      searchSource.destroy();
      expect(searchRequestQueue.getCount()).to.be(0);
    });

    it('aborts all non-startable requests', function() {
      const searchSource = new SearchSource();
      searchSource.onResults();
      const searchRequest = searchRequestQueue.getSearchRequestAt(0);
      sinon.stub(searchRequest, 'canStart').returns(false);
      searchSource.destroy();
      expect(searchRequestQueue.getCount()).to.be(0);
    });
  });

  describe('#setField()', function() {
    it('sets the value for the property', function() {
      const searchSource = new SearchSource();
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).to.be(5);
    });

    it('throws an error if the property is not accepted', function() {
      const searchSource = new SearchSource();
      expect(() => searchSource.setField('index', 5)).to.throwError();
    });
  });

  describe('#getField()', function() {
    it('gets the value for the property', function() {
      const searchSource = new SearchSource();
      searchSource.setField('aggs', 5);
      expect(searchSource.getField('aggs')).to.be(5);
    });

    it('throws an error if the property is not accepted', function() {
      const searchSource = new SearchSource();
      expect(() => searchSource.getField('unacceptablePropName')).to.throwError();
    });
  });

  describe(`#setField('index')`, function() {
    describe('auto-sourceFiltering', function() {
      describe('new index pattern assigned', function() {
        it('generates a searchSource filter', function() {
          const searchSource = new SearchSource();
          expect(searchSource.getField('index')).to.be(undefined);
          expect(searchSource.getField('source')).to.be(undefined);
          searchSource.setField('index', indexPattern);
          expect(searchSource.getField('index')).to.be(indexPattern);
          expect(searchSource.getField('source')).to.be.a('function');
        });

        it('removes created searchSource filter on removal', function() {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', null);
          expect(searchSource.getField('index')).to.be(undefined);
          expect(searchSource.getField('source')).to.be(undefined);
        });
      });

      describe('new index pattern assigned over another', function() {
        it('replaces searchSource filter with new', function() {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          const searchSourceFilter1 = searchSource.getField('source');
          searchSource.setField('index', indexPattern2);
          expect(searchSource.getField('index')).to.be(indexPattern2);
          expect(searchSource.getField('source')).to.be.a('function');
          expect(searchSource.getField('source')).to.not.be(searchSourceFilter1);
        });

        it('removes created searchSource filter on removal', function() {
          const searchSource = new SearchSource();
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', indexPattern2);
          searchSource.setField('index', null);
          expect(searchSource.getField('index')).to.be(undefined);
          expect(searchSource.getField('source')).to.be(undefined);
        });
      });

      describe('ip assigned before custom searchSource filter', function() {
        it('custom searchSource filter becomes new searchSource', function() {
          const searchSource = new SearchSource();
          const football = {};
          searchSource.setField('index', indexPattern);
          expect(searchSource.getField('source')).to.be.a('function');
          searchSource.setField('source', football);
          expect(searchSource.getField('index')).to.be(indexPattern);
          expect(searchSource.getField('source')).to.be(football);
        });

        it('custom searchSource stays after removal', function() {
          const searchSource = new SearchSource();
          const football = {};
          searchSource.setField('index', indexPattern);
          searchSource.setField('source', football);
          searchSource.setField('index', null);
          expect(searchSource.getField('index')).to.be(undefined);
          expect(searchSource.getField('source')).to.be(football);
        });
      });

      describe('ip assigned after custom searchSource filter', function() {
        it('leaves the custom filter in place', function() {
          const searchSource = new SearchSource();
          const football = {};
          searchSource.setField('source', football);
          searchSource.setField('index', indexPattern);
          expect(searchSource.getField('index')).to.be(indexPattern);
          expect(searchSource.getField('source')).to.be(football);
        });

        it('custom searchSource stays after removal', function() {
          const searchSource = new SearchSource();
          const football = {};
          searchSource.setField('source', football);
          searchSource.setField('index', indexPattern);
          searchSource.setField('index', null);
          expect(searchSource.getField('index')).to.be(undefined);
          expect(searchSource.getField('source')).to.be(football);
        });
      });
    });
  });

  describe('#onRequestStart()', () => {
    it('should be called when starting a request', async () => {
      const searchSource = new SearchSource();
      const fn = sinon.spy();
      searchSource.onRequestStart(fn);
      const request = {};
      searchSource.requestIsStarting(request);
      await timeout();
      expect(fn.calledWith(searchSource, request)).to.be(true);
    });

    it('should not be called on parent searchSource', async () => {
      const parent = new SearchSource();
      const searchSource = new SearchSource().setParent(parent);

      const fn = sinon.spy();
      searchSource.onRequestStart(fn);
      const parentFn = sinon.spy();
      parent.onRequestStart(parentFn);
      const request = {};
      searchSource.requestIsStarting(request);
      await timeout();
      expect(fn.calledWith(searchSource, request)).to.be(true);
      expect(parentFn.notCalled).to.be(true);
    });

    it('should be called on parent searchSource if callParentStartHandlers is true', async () => {
      const parent = new SearchSource();
      const searchSource = new SearchSource().setParent(parent, { callParentStartHandlers: true });

      const fn = sinon.spy();
      searchSource.onRequestStart(fn);
      const parentFn = sinon.spy();
      parent.onRequestStart(parentFn);
      const request = {};
      searchSource.requestIsStarting(request);
      await timeout();
      expect(fn.calledWith(searchSource, request)).to.be(true);
      expect(parentFn.calledWith(searchSource, request)).to.be(true);
    });
  });

  describe('#_mergeProp', function() {
    describe('filter', function() {
      let searchSource;
      let state;

      beforeEach(function() {
        searchSource = new SearchSource();
        state = {};
      });

      [null, undefined].forEach(falsyValue => {
        it(`ignores ${falsyValue} filter`, function() {
          searchSource._mergeProp(state, falsyValue, 'filter');
          expect(state.filters).to.be(undefined);
        });
      });

      [false, 0, '', NaN].forEach(falsyValue => {
        it(`doesn't add ${falsyValue} filter`, function() {
          searchSource._mergeProp(state, falsyValue, 'filter');
          expect(state.filters).to.be.empty();
        });
      });

      it('adds "meta.disabled: undefined" filter', function() {
        const filter = {
          meta: {},
        };
        searchSource._mergeProp(state, filter, 'filter');
        expect(state.filters).to.eql([filter]);
      });

      it('adds "meta.disabled: false" filter', function() {
        const filter = {
          meta: {
            disabled: false,
          },
        };
        searchSource._mergeProp(state, filter, 'filter');
        expect(state.filters).to.eql([filter]);
      });

      it(`doesn't add "meta.disabled: true" filter`, function() {
        const filter = {
          meta: {
            disabled: true,
          },
        };
        searchSource._mergeProp(state, filter, 'filter');
        expect(state.filters).to.be.empty();
      });

      describe('when courier:ignoreFilterIfFieldNotInIndex is false', function() {
        it('adds filter for non-existent field', function() {
          config.set('courier:ignoreFilterIfFieldNotInIndex', false);
          const filter = {
            meta: {
              key: 'bar',
            },
          };
          state.index = {
            fields: [],
          };
          searchSource._mergeProp(state, filter, 'filter');
          expect(state.filters).to.eql([filter]);
        });
      });

      describe('when courier:ignoreFilterIfFieldNotInIndex is true', function() {
        it(`doesn't add filter for non-existent field`, function() {
          config.set('courier:ignoreFilterIfFieldNotInIndex', true);
          const filter = {
            meta: {
              key: 'bar',
            },
          };
          state.index = {
            fields: [],
          };
          searchSource._mergeProp(state, filter, 'filter');
          expect(state.filters).to.be.empty();
        });

        it(`adds filter for existent field`, function() {
          config.set('courier:ignoreFilterIfFieldNotInIndex', true);
          const filter = {
            meta: {
              key: 'bar',
            },
          };
          state.index = {
            fields: [{ name: 'bar' }],
          };
          searchSource._mergeProp(state, filter, 'filter');
          expect(state.filters).to.eql([filter]);
        });
      });
    });
  });
});
