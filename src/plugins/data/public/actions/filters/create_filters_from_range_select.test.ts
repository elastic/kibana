/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import { createFiltersFromRangeSelectAction } from './create_filters_from_range_select';

import { IndexPatternsContract } from '../..';
import { dataPluginMock } from '../../mocks';
import { setIndexPatterns, setSearchService } from '../../services';
import { FieldFormatsGetConfigFn } from '@kbn/field-formats-plugin/common';
import { DateFormat } from '@kbn/field-formats-plugin/public';
import { RangeFilter } from '@kbn/es-query';

describe('brushEvent', () => {
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const JAN_01_2014 = 1388559600000;
  let baseEvent: {
    table: any;
    column: number;
    range: number[];
    timeFieldName?: string;
  };

  const mockField = {
    name: 'time',
    indexPattern: {
      id: 'logstash-*',
    },
    filterable: true,
    format: new DateFormat({}, (() => {}) as FieldFormatsGetConfigFn),
  };

  const indexPattern = {
    id: 'indexPatternId',
    timeFieldName: 'time',
    fields: {
      getByName: () => mockField,
      filter: () => [mockField],
    },
  };

  const serializedAggConfig = {
    type: 'date_histogram',
    params: {
      field: {},
    },
  };

  beforeEach(() => {
    const dataStart = dataPluginMock.createStartContract();
    setSearchService(dataStart.search);
    setIndexPatterns({
      ...dataStart.indexPatterns,
      get: async () => indexPattern,
    } as unknown as IndexPatternsContract);

    baseEvent = {
      column: 0,
      table: {
        type: 'datatable',
        columns: [
          {
            id: '1',
            name: '1',
            meta: {
              type: 'date',
              sourceParams: {
                indexPatternId: 'indexPatternId',
                ...serializedAggConfig,
              },
              source: 'esaggs',
            },
          },
        ],
        rows: [],
      },
      range: [],
    };
  });

  test('should be a function', () => {
    expect(typeof createFiltersFromRangeSelectAction).toBe('function');
  });

  test('ignores event when data.xAxisField not provided', async () => {
    const filter = await createFiltersFromRangeSelectAction(baseEvent);
    expect(filter).toEqual([]);
  });

  describe('handles an event when the x-axis field is a date field', () => {
    describe('date field is index pattern timefield', () => {
      beforeEach(() => {
        serializedAggConfig.params.field = {
          name: 'time',
          type: 'date',
        };
      });

      afterAll(() => {
        baseEvent.range = [];
        serializedAggConfig.params.field = {};
      });

      test('by ignoring the event when range spans zero time', async () => {
        baseEvent.range = [JAN_01_2014, JAN_01_2014];
        const filter = await createFiltersFromRangeSelectAction(baseEvent);
        expect(filter).toEqual([]);
      });

      test('by updating the timefilter', async () => {
        baseEvent.range = [JAN_01_2014, JAN_01_2014 + DAY_IN_MS];
        const filter = await createFiltersFromRangeSelectAction(baseEvent);
        expect(filter).toBeDefined();

        if (filter.length) {
          const rangeFilter = filter[0] as RangeFilter;
          expect(rangeFilter.query.range.time.gte).toBe(new Date(JAN_01_2014).toISOString());
          // Set to a baseline timezone for comparison.
          expect(rangeFilter.query.range.time.lt).toBe(
            new Date(JAN_01_2014 + DAY_IN_MS).toISOString()
          );
        }
      });
    });

    describe('date field is not index pattern timefield', () => {
      beforeEach(() => {
        serializedAggConfig.params.field = {
          name: 'anotherTimeField',
          type: 'date',
        };
      });

      afterAll(() => {
        baseEvent.range = [];
        serializedAggConfig.params.field = {};
      });

      test('creates a new range filter', async () => {
        const rangeBegin = JAN_01_2014;
        const rangeEnd = rangeBegin + DAY_IN_MS;
        baseEvent.range = [rangeBegin, rangeEnd];
        const filter = await createFiltersFromRangeSelectAction(baseEvent);

        expect(filter).toBeDefined();

        if (filter.length) {
          const rangeFilter = filter[0] as RangeFilter;
          expect(rangeFilter.query.range.anotherTimeField.gte).toBe(
            moment(rangeBegin).toISOString()
          );
          expect(rangeFilter.query.range.anotherTimeField.lt).toBe(moment(rangeEnd).toISOString());
          expect(rangeFilter.query.range.anotherTimeField).toHaveProperty(
            'format',
            'strict_date_optional_time'
          );
        }
      });
    });
  });

  describe('handles an event when the x-axis field is a number', () => {
    beforeAll(() => {
      serializedAggConfig.params.field = {
        name: 'numberField',
        type: 'number',
      };
    });

    afterAll(() => {
      baseEvent.range = [];
    });

    test('by ignoring the event when range does not span at least 2 values', async () => {
      baseEvent.range = [1];
      const filter = await createFiltersFromRangeSelectAction(baseEvent);
      expect(filter).toEqual([]);
    });

    test('by creating a new filter', async () => {
      baseEvent.range = [1, 2, 3, 4];
      const filter = await createFiltersFromRangeSelectAction(baseEvent);

      expect(filter).toBeDefined();

      if (filter.length) {
        const rangeFilter = filter[0] as RangeFilter;
        expect(rangeFilter.query.range.numberField.gte).toBe(1);
        expect(rangeFilter.query.range.numberField.lt).toBe(4);
        expect(rangeFilter.query.range.numberField).not.toHaveProperty('format');
      }
    });
  });
});
