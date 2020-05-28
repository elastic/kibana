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

import moment from 'moment';
import * as _ from 'lodash';
import { createIndexPatternsStub, createContextSearchSourceStub } from './_stubs';
import { fetchContextProvider } from './context';
import { setServices } from '../../../../kibana_services';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ANCHOR_TIMESTAMP = new Date(MS_PER_DAY).toJSON();
const ANCHOR_TIMESTAMP_3 = new Date(MS_PER_DAY * 3).toJSON();
const ANCHOR_TIMESTAMP_1000 = new Date(MS_PER_DAY * 1000).toJSON();
const ANCHOR_TIMESTAMP_3000 = new Date(MS_PER_DAY * 3000).toJSON();

describe('context app', function () {
  describe('function fetchPredecessors', function () {
    let fetchPredecessors;
    let mockSearchSource;

    beforeEach(() => {
      mockSearchSource = createContextSearchSourceStub([], '@timestamp', MS_PER_DAY * 8);

      setServices({
        data: {
          search: {
            searchSource: {
              create: jest.fn().mockImplementation(() => mockSearchSource),
            },
          },
        },
      });

      fetchPredecessors = (
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
          'predecessors',
          indexPatternId,
          anchor,
          timeField,
          tieBreakerField,
          sortDir,
          size,
          []
        );
      };
    });

    it('should perform exactly one query when enough hits are returned', function () {
      mockSearchSource._stubHits = [
        mockSearchSource._createStubHit(MS_PER_DAY * 3000 + 2),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000 + 1),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000),
        mockSearchSource._createStubHit(MS_PER_DAY * 2000),
        mockSearchSource._createStubHit(MS_PER_DAY * 1000),
      ];

      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_3000,
        MS_PER_DAY * 3000,
        '_doc',
        0,
        3,
        []
      ).then((hits) => {
        expect(mockSearchSource.fetch.calledOnce).toBe(true);
        expect(hits).toEqual(mockSearchSource._stubHits.slice(0, 3));
      });
    });

    it('should perform multiple queries with the last being unrestricted when too few hits are returned', function () {
      mockSearchSource._stubHits = [
        mockSearchSource._createStubHit(MS_PER_DAY * 3010),
        mockSearchSource._createStubHit(MS_PER_DAY * 3002),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000),
        mockSearchSource._createStubHit(MS_PER_DAY * 2998),
        mockSearchSource._createStubHit(MS_PER_DAY * 2990),
      ];

      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_3000,
        MS_PER_DAY * 3000,
        '_doc',
        0,
        6,
        []
      ).then((hits) => {
        const intervals = mockSearchSource.setField.args
          .filter(([property]) => property === 'query')
          .map(([, { query }]) =>
            _.get(query, ['constant_score', 'filter', 'range', '@timestamp'])
          );

        expect(
          intervals.every(({ gte, lte }) => (gte && lte ? moment(gte).isBefore(lte) : true))
        ).toBe(true);
        // should have started at the given time
        expect(intervals[0].gte).toEqual(moment(MS_PER_DAY * 3000).toISOString());
        // should have ended with a half-open interval
        expect(Object.keys(_.last(intervals))).toEqual(['format', 'gte']);
        expect(intervals.length).toBeGreaterThan(1);

        expect(hits).toEqual(mockSearchSource._stubHits.slice(0, 3));
      });
    });

    it('should perform multiple queries until the expected hit count is returned', function () {
      mockSearchSource._stubHits = [
        mockSearchSource._createStubHit(MS_PER_DAY * 1700),
        mockSearchSource._createStubHit(MS_PER_DAY * 1200),
        mockSearchSource._createStubHit(MS_PER_DAY * 1100),
        mockSearchSource._createStubHit(MS_PER_DAY * 1000),
      ];

      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_1000,
        MS_PER_DAY * 1000,
        '_doc',
        0,
        3,
        []
      ).then((hits) => {
        const intervals = mockSearchSource.setField.args
          .filter(([property]) => property === 'query')
          .map(([, { query }]) =>
            _.get(query, ['constant_score', 'filter', 'range', '@timestamp'])
          );

        // should have started at the given time
        expect(intervals[0].gte).toEqual(moment(MS_PER_DAY * 1000).toISOString());
        // should have stopped before reaching MS_PER_DAY * 1700
        expect(moment(_.last(intervals).lte).valueOf()).toBeLessThan(MS_PER_DAY * 1700);
        expect(intervals.length).toBeGreaterThan(1);
        expect(hits).toEqual(mockSearchSource._stubHits.slice(-3));
      });
    });

    it('should return an empty array when no hits were found', function () {
      return fetchPredecessors(
        'INDEX_PATTERN_ID',
        '@timestamp',
        'desc',
        ANCHOR_TIMESTAMP_3,
        MS_PER_DAY * 3,
        '_doc',
        0,
        3,
        []
      ).then((hits) => {
        expect(hits).toEqual([]);
      });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      return fetchPredecessors(
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
        const setParentSpy = mockSearchSource.setParent;
        expect(setParentSpy.alwaysCalledWith(undefined)).toBe(true);
        expect(setParentSpy.called).toBe(true);
      });
    });

    it('should set the tiebreaker sort order to the opposite as the time field', function () {
      return fetchPredecessors(
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
          mockSearchSource.setField.calledWith('sort', [{ '@timestamp': 'asc' }, { _doc: 'asc' }])
        ).toBe(true);
      });
    });
  });
});
