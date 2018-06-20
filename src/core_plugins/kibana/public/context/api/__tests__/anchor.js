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

import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { createCourierStub } from './_stubs';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

import { fetchAnchorProvider } from '../anchor';


describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('function fetchAnchor', function () {
    let fetchAnchor;
    let SearchSourceStub;

    beforeEach(ngMock.module(function createServiceStubs($provide) {
      $provide.value('courier', createCourierStub());
    }));

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      SearchSourceStub = createSearchSourceStubProvider([
        { _id: 'hit1' },
      ]);
      Private.stub(SearchSourceProvider, SearchSourceStub);

      fetchAnchor = Private(fetchAnchorProvider);
    }));

    it('should use the `fetchAsRejectablePromise` method of the SearchSource', function () {
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then(() => {
          expect(searchSourceStub.fetchAsRejectablePromise.calledOnce).to.be(true);
        });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then(() => {
          const inheritsSpy = searchSourceStub.inherits;
          expect(inheritsSpy.calledOnce).to.be(true);
          expect(inheritsSpy.firstCall.args[0]).to.eql(false);
        });
    });

    it('should set the SearchSource index pattern', function () {
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then(() => {
          const setIndexSpy = searchSourceStub.set.withArgs('index');
          expect(setIndexSpy.calledOnce).to.be(true);
          expect(setIndexSpy.firstCall.args[1]).to.eql({ id: 'INDEX_PATTERN_ID' });
        });
    });

    it('should set the SearchSource version flag to true', function () {
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then(() => {
          const setVersionSpy = searchSourceStub.set.withArgs('version');
          expect(setVersionSpy.calledOnce).to.be(true);
          expect(setVersionSpy.firstCall.args[1]).to.eql(true);
        });
    });

    it('should set the SearchSource size to 1', function () {
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then(() => {
          const setSizeSpy = searchSourceStub.set.withArgs('size');
          expect(setSizeSpy.calledOnce).to.be(true);
          expect(setSizeSpy.firstCall.args[1]).to.eql(1);
        });
    });

    it('should set the SearchSource query to an ids query', function () {
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then(() => {
          const setQuerySpy = searchSourceStub.set.withArgs('query');
          expect(setQuerySpy.calledOnce).to.be(true);
          expect(setQuerySpy.firstCall.args[1]).to.eql({
            query: {
              constant_score: {
                filter: {
                  ids: {
                    type: 'doc',
                    values: ['id'],
                  },
                }
              }
            },
            language: 'lucene'
          });
        });
    });

    it('should set the SearchSource sort order', function () {
      const searchSourceStub = new SearchSourceStub();

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then(() => {
          const setSortSpy = searchSourceStub.set.withArgs('sort');
          expect(setSortSpy.calledOnce).to.be(true);
          expect(setSortSpy.firstCall.args[1]).to.eql([
            { '@timestamp': 'desc' },
            { '_doc': 'asc' },
          ]);
        });
    });

    it('should reject with an error when no hits were found', function () {
      const searchSourceStub = new SearchSourceStub();
      searchSourceStub._stubHits = [];

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then(
          () => {
            expect().fail('expected the promise to be rejected');
          },
          (error) => {
            expect(error).to.be.an(Error);
          }
        );
    });

    it('should return the first hit after adding an anchor marker', function () {
      const searchSourceStub = new SearchSourceStub();
      searchSourceStub._stubHits = [
        { property1: 'value1' },
        { property2: 'value2' },
      ];

      return fetchAnchor('INDEX_PATTERN_ID', 'doc', 'id', [{ '@timestamp': 'desc' }, { '_doc': 'asc' }])
        .then((anchorDocument) => {
          expect(anchorDocument).to.have.property('property1', 'value1');
          expect(anchorDocument).to.have.property('$$_isAnchor', true);
        });
    });
  });
});

function createSearchSourceStubProvider(hits) {
  const searchSourceStub = {
    _stubHits: hits,
  };

  searchSourceStub.filter = sinon.stub().returns(searchSourceStub);
  searchSourceStub.inherits = sinon.stub().returns(searchSourceStub);
  searchSourceStub.set = sinon.stub().returns(searchSourceStub);
  searchSourceStub.fetchAsRejectablePromise = sinon.spy(() => Promise.resolve({
    hits: {
      hits: searchSourceStub._stubHits,
      total: searchSourceStub._stubHits.length,
    },
  }));

  return function SearchSourceStubProvider() {
    return searchSourceStub;
  };
}
