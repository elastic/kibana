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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import moment from 'moment';
import * as _ from 'lodash';
import { pluginInstance } from 'plugins/kibana/discover/index';

import { createIndexPatternsStub, createContextSearchSourceStub } from './_stubs';

import { fetchContextProvider } from '../context';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ANCHOR_TIMESTAMP = new Date(MS_PER_DAY).toJSON();
const ANCHOR_TIMESTAMP_3 = new Date(MS_PER_DAY * 3).toJSON();
const ANCHOR_TIMESTAMP_3000 = new Date(MS_PER_DAY * 3000).toJSON();

describe('context app', function() {
  beforeEach(() => pluginInstance.initializeInnerAngular());
  beforeEach(ngMock.module('app/discover'));

  describe('function fetchSuccessors', function() {
    let fetchSuccessors;
    let searchSourceStub;

    beforeEach(
      ngMock.inject(function createPrivateStubs() {
        searchSourceStub = createContextSearchSourceStub([], '@timestamp');

        fetchSuccessors = (
          indexPatternId,
          timeField,
          sortDir,
          timeValIso,
          timeValNr,
          tieBreakerField,
          tieBreakerValue,
          size
        ) => {
          const anchor = {
            _source: {
              [timeField]: timeValIso,
            },
            sort: [timeValNr, tieBreakerValue],
          };

          return fetchContextProvider(createIndexPatternsStub()).fetchSurroundingDocs(
            'successors',
            indexPatternId,
            anchor,
            timeField,
            tieBreakerField,
            sortDir,
            size,
            []
          );
        };
      })
    );

    afterEach(() => {
      searchSourceStub._restore();
    });

    it('should perform exactly one query when enough hits are returned', function() {
      searchSourceStub._stubHits = [
        searchSourceStub._createStubHit(MS_PER_DAY * 5000),
        searchSourceStub._createStubHit(MS_PER_DAY * 4000),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000 - 1),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000 - 2),
      ];

      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_3000,
        MS_PER_DAY * 3000,
        '_doc',
        0,
        3,
        []
      ).then(hits => {
        expect(searchSourceStub.fetch.calledOnce).to.be(true);
        expect(hits).to.eql(searchSourceStub._stubHits.slice(-3));
      });
    });

    it('should perform multiple queries with the last being unrestricted when too few hits are returned', function() {
      searchSourceStub._stubHits = [
        searchSourceStub._createStubHit(MS_PER_DAY * 3010),
        searchSourceStub._createStubHit(MS_PER_DAY * 3002),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000),
        searchSourceStub._createStubHit(MS_PER_DAY * 2998),
        searchSourceStub._createStubHit(MS_PER_DAY * 2990),
      ];

      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_3000,
        MS_PER_DAY * 3000,
        '_doc',
        0,
        6,
        []
      ).then(hits => {
        const intervals = searchSourceStub.setField.args
          .filter(([property]) => property === 'query')
          .map(([, { query }]) =>
            _.get(query, ['constant_score', 'filter', 'range', '@timestamp'])
          );

        expect(
          intervals.every(({ gte, lte }) => (gte && lte ? moment(gte).isBefore(lte) : true))
        ).to.be(true);
        // should have started at the given time
        expect(intervals[0].lte).to.eql(moment(MS_PER_DAY * 3000).toISOString());
        // should have ended with a half-open interval
        expect(_.last(intervals)).to.only.have.keys('lte', 'format');
        expect(intervals.length).to.be.greaterThan(1);

        expect(hits).to.eql(searchSourceStub._stubHits.slice(-3));
      });
    });

    it('should perform multiple queries until the expected hit count is returned', function() {
      searchSourceStub._stubHits = [
        searchSourceStub._createStubHit(MS_PER_DAY * 3000),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000 - 1),
        searchSourceStub._createStubHit(MS_PER_DAY * 3000 - 2),
        searchSourceStub._createStubHit(MS_PER_DAY * 2800),
        searchSourceStub._createStubHit(MS_PER_DAY * 2200),
        searchSourceStub._createStubHit(MS_PER_DAY * 1000),
      ];

      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_3000,
        MS_PER_DAY * 3000,
        '_doc',
        0,
        4,
        []
      ).then(hits => {
        const intervals = searchSourceStub.setField.args
          .filter(([property]) => property === 'query')
          .map(([, { query }]) =>
            _.get(query, ['constant_score', 'filter', 'range', '@timestamp'])
          );

        // should have started at the given time
        expect(intervals[0].lte).to.eql(moment(MS_PER_DAY * 3000).toISOString());
        // should have stopped before reaching MS_PER_DAY * 2200
        expect(moment(_.last(intervals).gte).valueOf()).to.be.greaterThan(MS_PER_DAY * 2200);
        expect(intervals.length).to.be.greaterThan(1);

        expect(hits).to.eql(searchSourceStub._stubHits.slice(0, 4));
      });
    });

    it('should return an empty array when no hits were found', function() {
      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_3,
        MS_PER_DAY * 3,
        '_doc',
        0,
        3,
        []
      ).then(hits => {
        expect(hits).to.eql([]);
      });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function() {
      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_3,
        MS_PER_DAY * 3,
        '_doc',
        0,
        3,
        []
      ).then(() => {
        const setParentSpy = searchSourceStub.setParent;
        expect(setParentSpy.alwaysCalledWith(undefined)).to.be(true);
        expect(setParentSpy.called).to.be(true);
      });
    });

    it('should set the tiebreaker sort order to the same as the time field', function() {
      return fetchSuccessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP,
        MS_PER_DAY,
        '_doc',
        0,
        3,
        []
      ).then(() => {
        expect(
          searchSourceStub.setField.calledWith('sort', [{ '@timestamp': 'desc' }, { _doc: 'desc' }])
        ).to.be(true);
      });
    });
  });
});
