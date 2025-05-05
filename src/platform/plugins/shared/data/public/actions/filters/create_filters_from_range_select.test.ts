/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';

import {
  createFiltersFromRangeSelectAction,
  type RangeSelectDataContext,
} from './create_filters_from_range_select';

import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { dataPluginMock } from '../../mocks';
import { setIndexPatterns, setSearchService } from '../../services';
import { FieldFormatsGetConfigFn } from '@kbn/field-formats-plugin/common';
import { DateFormat } from '@kbn/field-formats-plugin/public';
import { RangeFilter } from '@kbn/es-query';

describe('brushEvent', () => {
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const JAN_01_2014 = 1388559600000;
  let baseEvent: RangeSelectDataContext;
  let esqlEventContext: RangeSelectDataContext;

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
    } as unknown as DataViewsContract);

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

    esqlEventContext = {
      column: 0,
      query: { esql: 'FROM indexPatternId | limit 10' },
      table: {
        type: 'datatable',
        meta: {
          type: 'es_ql',
        },
        columns: [
          {
            id: '1',
            name: '1',
            meta: {
              type: 'date',
              sourceParams: {},
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

  describe('handles an event for an ES_QL query', () => {
    afterAll(() => {
      esqlEventContext.range = [];
    });

    test('by ignoring the event when range does not span at least 2 values', async () => {
      esqlEventContext.range = [JAN_01_2014];
      const filter = await createFiltersFromRangeSelectAction(esqlEventContext);
      expect(filter).toEqual([]);
    });

    test('by creating a new filter', async () => {
      const rangeBegin = JAN_01_2014;
      const rangeEnd = rangeBegin + DAY_IN_MS;
      esqlEventContext.range = [rangeBegin, rangeEnd];
      const filter = await createFiltersFromRangeSelectAction(esqlEventContext);

      expect(filter).toBeDefined();

      if (filter.length) {
        const rangeFilter = filter[0] as RangeFilter;
        expect(rangeFilter.meta.index).toBeUndefined();
        expect(rangeFilter.query.range['1'].gte).toBe(moment(rangeBegin).toISOString());
        expect(rangeFilter.query.range['1'].lt).toBe(moment(rangeEnd).toISOString());
        expect(rangeFilter.query.range['1']).toHaveProperty('format', 'strict_date_optional_time');
      }
    });

    test('for column with different name than source field', async () => {
      const rangeBegin = JAN_01_2014;
      const rangeEnd = rangeBegin + DAY_IN_MS;
      esqlEventContext.range = [rangeBegin, rangeEnd];
      esqlEventContext.table.columns[0].meta!.sourceParams!.sourceField = 'time';
      esqlEventContext.table.columns[0].name = 'time over 12h';

      const filter = await createFiltersFromRangeSelectAction(esqlEventContext);

      expect(filter).toBeDefined();
      expect(filter.length).toEqual(1);
      expect(filter[0].query).toBeDefined();
      expect(filter[0].query!.range.time).toBeDefined();
    });
  });
});
