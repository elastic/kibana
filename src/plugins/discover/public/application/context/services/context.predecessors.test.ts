/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { get, last } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SortDirection } from '@kbn/data-plugin/public';
import { createContextSearchSourceStub } from './_stubs';
import { fetchSurroundingDocs, SurrDocType } from './context';
import { DataPublicPluginStart, Query } from '@kbn/data-plugin/public';
import { EsHitRecord, EsHitRecordList } from '../../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ANCHOR_TIMESTAMP = new Date(MS_PER_DAY).toJSON();
const ANCHOR_TIMESTAMP_3 = new Date(MS_PER_DAY * 3).toJSON();
const ANCHOR_TIMESTAMP_1000 = new Date(MS_PER_DAY * 1000).toJSON();
const ANCHOR_TIMESTAMP_3000 = new Date(MS_PER_DAY * 3000).toJSON();

interface Timestamp {
  format: string;
  gte?: string;
  lte?: string;
}

describe('context predecessors', function () {
  let dataPluginMock: DataPublicPluginStart;
  let fetchPredecessors: (
    timeValIso: string,
    timeValNr: number,
    tieBreakerField: string,
    tieBreakerValue: number,
    size: number
  ) => Promise<EsHitRecordList>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSearchSource: any;
  const indexPattern = {
    id: 'INDEX_PATTERN_ID',
    timeFieldName: '@timestamp',
    isTimeNanosBased: () => false,
    popularizeField: () => {},
  } as unknown as DataView;

  describe('function fetchPredecessors', function () {
    beforeEach(() => {
      mockSearchSource = createContextSearchSourceStub('@timestamp');
      dataPluginMock = {
        search: {
          searchSource: {
            createEmpty: jest.fn().mockImplementation(() => mockSearchSource),
          },
        },
      } as unknown as DataPublicPluginStart;

      fetchPredecessors = (timeValIso, timeValNr, tieBreakerField, tieBreakerValue, size = 10) => {
        const anchor = {
          _source: {
            [indexPattern.timeFieldName!]: timeValIso,
          },
          sort: [timeValNr, tieBreakerValue],
        };

        return fetchSurroundingDocs(
          SurrDocType.PREDECESSORS,
          indexPattern,
          anchor as EsHitRecord,
          tieBreakerField,
          SortDirection.desc,
          size,
          [],
          dataPluginMock
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

      return fetchPredecessors(ANCHOR_TIMESTAMP_3000, MS_PER_DAY * 3000, '_doc', 0, 3).then(
        (hits: EsHitRecordList) => {
          expect(mockSearchSource.fetch.calledOnce).toBe(true);
          expect(hits).toEqual(mockSearchSource._stubHits.slice(0, 3));
        }
      );
    });

    it('should perform multiple queries with the last being unrestricted when too few hits are returned', function () {
      mockSearchSource._stubHits = [
        mockSearchSource._createStubHit(MS_PER_DAY * 3010),
        mockSearchSource._createStubHit(MS_PER_DAY * 3002),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000),
        mockSearchSource._createStubHit(MS_PER_DAY * 2998),
        mockSearchSource._createStubHit(MS_PER_DAY * 2990),
      ];

      return fetchPredecessors(ANCHOR_TIMESTAMP_3000, MS_PER_DAY * 3000, '_doc', 0, 6).then(
        (hits: EsHitRecordList) => {
          const intervals: Timestamp[] = mockSearchSource.setField.args
            .filter(([property]: string) => property === 'query')
            .map(([, { query }]: [string, { query: Query }]) =>
              get(query, ['bool', 'must', 'constant_score', 'filter', 'range', '@timestamp'])
            );

          expect(
            intervals.every(({ gte, lte }) => (gte && lte ? moment(gte).isBefore(lte) : true))
          ).toBe(true);
          // should have started at the given time
          expect(intervals[0].gte).toEqual(moment(MS_PER_DAY * 3000).toISOString());
          // should have ended with a half-open interval
          expect(Object.keys(last(intervals) ?? {})).toEqual(['format', 'gte']);
          expect(intervals.length).toBeGreaterThan(1);

          expect(hits).toEqual(mockSearchSource._stubHits.slice(0, 3));
        }
      );
    });

    it('should perform multiple queries until the expected hit count is returned', function () {
      mockSearchSource._stubHits = [
        mockSearchSource._createStubHit(MS_PER_DAY * 1700),
        mockSearchSource._createStubHit(MS_PER_DAY * 1200),
        mockSearchSource._createStubHit(MS_PER_DAY * 1100),
        mockSearchSource._createStubHit(MS_PER_DAY * 1000),
      ];

      return fetchPredecessors(ANCHOR_TIMESTAMP_1000, MS_PER_DAY * 1000, '_doc', 0, 3).then(
        (hits: EsHitRecordList) => {
          const intervals: Timestamp[] = mockSearchSource.setField.args
            .filter(([property]: string) => property === 'query')
            .map(([, { query }]: [string, { query: Query }]) => {
              return get(query, [
                'bool',
                'must',
                'constant_score',
                'filter',
                'range',
                '@timestamp',
              ]);
            });

          // should have started at the given time
          expect(intervals[0].gte).toEqual(moment(MS_PER_DAY * 1000).toISOString());
          // should have stopped before reaching MS_PER_DAY * 1700
          expect(moment(last(intervals)?.lte).valueOf()).toBeLessThan(MS_PER_DAY * 1700);
          expect(intervals.length).toBeGreaterThan(1);
          expect(hits).toEqual(mockSearchSource._stubHits.slice(-3));
        }
      );
    });

    it('should return an empty array when no hits were found', function () {
      return fetchPredecessors(ANCHOR_TIMESTAMP_3, MS_PER_DAY * 3, '_doc', 0, 3).then(
        (hits: EsHitRecordList) => {
          expect(hits).toEqual([]);
        }
      );
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      return fetchPredecessors(ANCHOR_TIMESTAMP_3, MS_PER_DAY * 3, '_doc', 0, 3).then(() => {
        const setParentSpy = mockSearchSource.setParent;
        expect(setParentSpy.alwaysCalledWith(undefined)).toBe(true);
        expect(setParentSpy.called).toBe(true);
      });
    });

    it('should set the tiebreaker sort order to the opposite as the time field', function () {
      return fetchPredecessors(ANCHOR_TIMESTAMP, MS_PER_DAY, '_doc', 0, 3).then(() => {
        expect(
          mockSearchSource.setField.calledWith('sort', [
            { '@timestamp': { order: 'asc', format: 'strict_date_optional_time' } },
            { _doc: 'asc' },
          ])
        ).toBe(true);
      });
    });
  });

  describe('function fetchPredecessors with useNewFieldsApi set', function () {
    beforeEach(() => {
      mockSearchSource = createContextSearchSourceStub('@timestamp');

      dataPluginMock = {
        search: {
          searchSource: {
            createEmpty: jest.fn().mockImplementation(() => mockSearchSource),
          },
        },
      } as unknown as DataPublicPluginStart;

      fetchPredecessors = (timeValIso, timeValNr, tieBreakerField, tieBreakerValue, size = 10) => {
        const anchor = {
          _source: {
            [indexPattern.timeFieldName!]: timeValIso,
          },
          sort: [timeValNr, tieBreakerValue],
        };

        return fetchSurroundingDocs(
          SurrDocType.PREDECESSORS,
          indexPattern,
          anchor as EsHitRecord,
          tieBreakerField,
          SortDirection.desc,
          size,
          [],
          dataPluginMock,
          true
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

      return fetchPredecessors(ANCHOR_TIMESTAMP_3000, MS_PER_DAY * 3000, '_doc', 0, 3).then(
        (hits: EsHitRecordList) => {
          const setFieldsSpy = mockSearchSource.setField.withArgs('fields');
          const removeFieldsSpy = mockSearchSource.removeField.withArgs('fieldsFromSource');
          expect(mockSearchSource.fetch.calledOnce).toBe(true);
          expect(removeFieldsSpy.calledOnce).toBe(true);
          expect(setFieldsSpy.calledOnce).toBe(true);
          expect(hits).toEqual(mockSearchSource._stubHits.slice(0, 3));
        }
      );
    });
  });
});
