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
import * as _ from 'lodash';

import { createIndexPatternsStub, createSearchSourceStubProvider } from './_stubs';
import { SearchSourceProvider } from 'ui/courier';

import { fetchContextProvider } from '../context';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('context app', function () {
  beforeEach(ngMock.module('kibana'));

  describe('function fetchPredecessors', function () {
    let fetchPredecessors;
    let getSearchSourceStub;

    beforeEach(ngMock.module(function createServiceStubs($provide) {
      $provide.value('indexPatterns', createIndexPatternsStub());
    }));

    beforeEach(ngMock.inject(function createPrivateStubs(Private) {
      getSearchSourceStub = createSearchSourceStubProvider([], '@timestamp', MS_PER_DAY * 8);
      Private.stub(SearchSourceProvider, getSearchSourceStub);

      fetchPredecessors = Private(fetchContextProvider).fetchPredecessors;
    }));

    it('should perform exactly one query when enough hits are returned', function () {
      const searchSourceStub = getSearchSourceStub();
      searchSourceStub._stubHits = [
        searchSourceStub._createStubHit(MS_PER_DAY * 3000 + 2),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000 + 1),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000),
        searchSourceStub._createStubHit(MS_PER_DAY * 2000),
        searchSourceStub._createStubHit(MS_PER_DAY * 1000),
      ];

      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 3000,
        '_doc',
        'asc',
        0,
        3,
        []
      )
        .then((hits) => {
          expect(searchSourceStub.fetch.calledOnce).to.be(true);
          expect(hits).to.eql(searchSourceStub._stubHits.slice(0, 3));
        });
    });

    it('should perform multiple queries with the last being unrestricted when too few hits are returned', function () {
      const searchSourceStub = getSearchSourceStub();
      searchSourceStub._stubHits = [
        searchSourceStub._createStubHit(MS_PER_DAY * 3010),
        searchSourceStub._createStubHit(MS_PER_DAY * 3002),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000),
        searchSourceStub._createStubHit(MS_PER_DAY * 2998),
        searchSourceStub._createStubHit(MS_PER_DAY * 2990),
      ];

      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 3000,
        '_doc',
        'asc',
        0,
        6,
        []
      )
        .then((hits) => {
          const intervals = searchSourceStub.setField.args
            .filter(([property]) => property === 'query')
            .map(([, { query }]) => _.get(query, ['constant_score', 'filter', 'range', '@timestamp']));

          expect(intervals.every(({ gte, lte }) => (gte && lte) ? gte < lte : true)).to.be(true);
          // should have started at the given time
          expect(intervals[0].gte).to.eql(MS_PER_DAY * 3000);
          // should have ended with a half-open interval
          expect(_.last(intervals)).to.only.have.keys('gte', 'format');
          expect(intervals.length).to.be.greaterThan(1);

          expect(hits).to.eql(searchSourceStub._stubHits.slice(0, 3));
        });
    });

    it('should perform multiple queries until the expected hit count is returned', function () {
      const searchSourceStub = getSearchSourceStub();
      searchSourceStub._stubHits = [
        searchSourceStub._createStubHit(MS_PER_DAY * 1700),
        searchSourceStub._createStubHit(MS_PER_DAY * 1200),
        searchSourceStub._createStubHit(MS_PER_DAY * 1100),
        searchSourceStub._createStubHit(MS_PER_DAY * 1000),
      ];

      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 1000,
        '_doc',
        'asc',
        0,
        3,
        []
      )
        .then((hits) => {
          const intervals = searchSourceStub.setField.args
            .filter(([property]) => property === 'query')
            .map(([, { query }]) => _.get(query, ['constant_score', 'filter', 'range', '@timestamp']));

          // should have started at the given time
          expect(intervals[0].gte).to.eql(MS_PER_DAY * 1000);
          // should have stopped before reaching MS_PER_DAY * 1700
          expect(_.last(intervals).lte).to.be.lessThan(MS_PER_DAY * 1700);
          expect(intervals.length).to.be.greaterThan(1);

          expect(hits).to.eql(searchSourceStub._stubHits.slice(-3));
        });
    });

    it('should return an empty array when no hits were found', function () {
      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 3,
        '_doc',
        'asc',
        0,
        3,
        []
      )
        .then((hits) => {
          expect(hits).to.eql([]);
        });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      const searchSourceStub = getSearchSourceStub();

      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        MS_PER_DAY * 3,
        '_doc',
        'asc',
        0,
        3,
        []
      )
        .then(() => {
          const setParentSpy = searchSourceStub.setParent;
          expect(setParentSpy.alwaysCalledWith(false)).to.be(true);
          expect(setParentSpy.called).to.be(true);
        });
    });
  });
});
