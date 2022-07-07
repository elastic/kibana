/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { get, last } from 'lodash';
import { SortDirection } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { createContextSearchSourceStub } from './_stubs';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Query } from '@kbn/es-query';
import { fetchSurroundingDocs, SurrDocType } from './context';
import { DataTableRecord } from '../../../types';
import { buildDataTableRecord, buildDataTableRecordList } from '../../../utils/build_data_record';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ANCHOR_TIMESTAMP = new Date(MS_PER_DAY).toJSON();
const ANCHOR_TIMESTAMP_3 = new Date(MS_PER_DAY * 3).toJSON();
const ANCHOR_TIMESTAMP_3000 = new Date(MS_PER_DAY * 3000).toJSON();

interface Timestamp {
  format: string;
  gte?: string;
  lte?: string;
}

describe('context successors', function () {
  let fetchSuccessors: (
    timeValIso: string,
    timeValNr: number,
    tieBreakerField: string,
    tieBreakerValue: number,
    size: number
  ) => Promise<DataTableRecord[]>;
  let dataPluginMock: DataPublicPluginStart;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSearchSource: any;
  const dataView = {
    id: 'DATA_VIEW_ID',
    timeFieldName: '@timestamp',
    isTimeNanosBased: () => false,
    popularizeField: () => {},
    fields: {
      getByName: jest.fn(),
    },
  } as unknown as DataView;

  describe('function fetchSuccessors', function () {
    beforeEach(() => {
      mockSearchSource = createContextSearchSourceStub('@timestamp');

      dataPluginMock = {
        search: {
          searchSource: {
            createEmpty: jest.fn().mockImplementation(() => mockSearchSource),
          },
        },
      } as unknown as DataPublicPluginStart;

      fetchSuccessors = (timeValIso, timeValNr, tieBreakerField, tieBreakerValue, size) => {
        const anchor = buildDataTableRecord(
          {
            _index: 't',
            _id: '1',
            _source: {
              [dataView.timeFieldName!]: timeValIso,
            },
            sort: [timeValNr, tieBreakerValue],
          },
          dataView,
          true
        );

        return fetchSurroundingDocs(
          SurrDocType.SUCCESSORS,
          dataView,
          anchor,
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
        mockSearchSource._createStubHit(MS_PER_DAY * 5000),
        mockSearchSource._createStubHit(MS_PER_DAY * 4000),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000 - 1),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000 - 2),
      ];

      return fetchSuccessors(ANCHOR_TIMESTAMP_3000, MS_PER_DAY * 3000, '_doc', 0, 3).then(
        (hits) => {
          expect(mockSearchSource.fetch$.calledOnce).toBe(true);
          expect(hits).toEqual(
            buildDataTableRecordList(mockSearchSource._stubHits.slice(-3), dataView)
          );
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

      return fetchSuccessors(ANCHOR_TIMESTAMP_3000, MS_PER_DAY * 3000, '_doc', 0, 6).then(
        (hits) => {
          const intervals: Timestamp[] = mockSearchSource.setField.args
            .filter(([property]: [string]) => property === 'query')
            .map(([, { query }]: [string, { query: Query }]) =>
              get(query, ['bool', 'must', 'constant_score', 'filter', 'range', '@timestamp'])
            );

          expect(
            intervals.every(({ gte, lte }) => (gte && lte ? moment(gte).isBefore(lte) : true))
          ).toBe(true);
          // should have started at the given time
          expect(intervals[0].lte).toEqual(moment(MS_PER_DAY * 3000).toISOString());
          // should have ended with a half-open interval
          expect(Object.keys(last(intervals) ?? {})).toEqual(['format', 'lte']);
          expect(intervals.length).toBeGreaterThan(1);
          expect(hits).toEqual(
            buildDataTableRecordList(mockSearchSource._stubHits.slice(-3), dataView)
          );
        }
      );
    });

    it('should perform multiple queries until the expected hit count is returned', function () {
      mockSearchSource._stubHits = [
        mockSearchSource._createStubHit(MS_PER_DAY * 3000),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000 - 1),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000 - 2),
        mockSearchSource._createStubHit(MS_PER_DAY * 2800),
        mockSearchSource._createStubHit(MS_PER_DAY * 2200),
        mockSearchSource._createStubHit(MS_PER_DAY * 1000),
      ];

      return fetchSuccessors(ANCHOR_TIMESTAMP_3000, MS_PER_DAY * 3000, '_doc', 0, 4).then(
        (hits) => {
          const intervals: Timestamp[] = mockSearchSource.setField.args
            .filter(([property]: [string]) => property === 'query')
            .map(([, { query }]: [string, { query: Query }]) =>
              get(query, ['bool', 'must', 'constant_score', 'filter', 'range', '@timestamp'])
            );

          // should have started at the given time
          expect(intervals[0].lte).toEqual(moment(MS_PER_DAY * 3000).toISOString());
          // should have stopped before reaching MS_PER_DAY * 2200
          expect(moment(last(intervals)?.gte).valueOf()).toBeGreaterThan(MS_PER_DAY * 2200);
          expect(intervals.length).toBeGreaterThan(1);
          expect(hits).toEqual(
            buildDataTableRecordList(mockSearchSource._stubHits.slice(0, 4), dataView)
          );
        }
      );
    });

    it('should return an empty array when no hits were found', function () {
      return fetchSuccessors(ANCHOR_TIMESTAMP_3, MS_PER_DAY * 3, '_doc', 0, 3).then((hits) => {
        expect(hits).toEqual([]);
      });
    });

    it('should configure the SearchSource to not inherit from the implicit root', function () {
      return fetchSuccessors(ANCHOR_TIMESTAMP_3, MS_PER_DAY * 3, '_doc', 0, 3).then(() => {
        const setParentSpy = mockSearchSource.setParent;
        expect(setParentSpy.alwaysCalledWith(undefined)).toBe(true);
        expect(setParentSpy.called).toBe(true);
      });
    });

    it('should set the tiebreaker sort order to the same as the time field', function () {
      return fetchSuccessors(ANCHOR_TIMESTAMP, MS_PER_DAY, '_doc', 0, 3).then(() => {
        expect(
          mockSearchSource.setField.calledWith('sort', [
            { '@timestamp': { order: SortDirection.desc, format: 'strict_date_optional_time' } },
            { _doc: SortDirection.desc },
          ])
        ).toBe(true);
      });
    });
  });

  describe('function fetchSuccessors with useNewFieldsApi set', function () {
    beforeEach(() => {
      mockSearchSource = createContextSearchSourceStub('@timestamp');

      dataPluginMock = {
        search: {
          searchSource: {
            createEmpty: jest.fn().mockImplementation(() => mockSearchSource),
          },
        },
      } as unknown as DataPublicPluginStart;

      fetchSuccessors = (timeValIso, timeValNr, tieBreakerField, tieBreakerValue, size) => {
        const anchor = buildDataTableRecord(
          {
            _id: '1',
            _index: 'test',
            _source: {
              [dataView.timeFieldName!]: timeValIso,
            },
            sort: [timeValNr, tieBreakerValue],
          },
          dataView,
          true
        );

        return fetchSurroundingDocs(
          SurrDocType.SUCCESSORS,
          dataView,
          anchor,
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
        mockSearchSource._createStubHit(MS_PER_DAY * 5000),
        mockSearchSource._createStubHit(MS_PER_DAY * 4000),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000 - 1),
        mockSearchSource._createStubHit(MS_PER_DAY * 3000 - 2),
      ];

      return fetchSuccessors(ANCHOR_TIMESTAMP_3000, MS_PER_DAY * 3000, '_doc', 0, 3).then(
        (hits) => {
          expect(mockSearchSource.fetch$.calledOnce).toBe(true);
          expect(hits).toEqual(
            buildDataTableRecordList(mockSearchSource._stubHits.slice(-3), dataView)
          );
          const setFieldsSpy = mockSearchSource.setField.withArgs('fields');
          const removeFieldsSpy = mockSearchSource.removeField.withArgs('fieldsFromSource');
          expect(removeFieldsSpy.calledOnce).toBe(true);
          expect(setFieldsSpy.calledOnce).toBe(true);
        }
      );
    });
  });
});
