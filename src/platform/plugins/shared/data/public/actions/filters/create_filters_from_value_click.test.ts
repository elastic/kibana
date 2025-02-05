/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { dataPluginMock } from '../../mocks';
import { setIndexPatterns, setSearchService } from '../../services';
import {
  createFiltersFromValueClickAction,
  appendFilterToESQLQueryFromValueClickAction,
  createFilterESQL,
} from './create_filters_from_value_click';
import { FieldFormatsGetConfigFn, BytesFormat } from '@kbn/field-formats-plugin/common';
import { RangeFilter } from '@kbn/es-query';
import { Datatable } from '@kbn/expressions-plugin/common';

const mockField = {
  name: 'bytes',
  filterable: true,
};
describe('createFiltersFromClickEvent', () => {
  const dataStart = dataPluginMock.createStartContract();
  setSearchService(dataStart.search);
  setIndexPatterns({
    ...dataStart.indexPatterns,
    get: async () => ({
      id: 'logstash-*',
      fields: {
        getByName: () => mockField,
        filter: () => [mockField],
      },
      getFormatterForField: () => new BytesFormat({}, (() => {}) as FieldFormatsGetConfigFn),
    }),
  } as unknown as DataViewsContract);
  describe('createFiltersFromValueClick', () => {
    let dataPoints: Parameters<typeof createFiltersFromValueClickAction>[0]['data'];

    beforeEach(() => {
      dataPoints = [
        {
          table: {
            columns: [
              {
                name: 'test',
                id: '1-1',
                meta: {
                  type: 'date',
                  source: 'esaggs',
                  sourceParams: {
                    indexPatternId: 'logstash-*',
                    type: 'histogram',
                    params: {
                      field: 'bytes',
                      interval: 30,
                      otherBucket: true,
                    },
                  },
                },
              },
            ],
            rows: [
              {
                '1-1': '2048',
              },
            ],
          },
          column: 0,
          row: 0,
          value: 'test',
        },
      ];
    });
    test('ignores event when value for rows is not provided', async () => {
      dataPoints[0].table.rows[0]['1-1'] = null;
      const filters = await createFiltersFromValueClickAction({ data: dataPoints });

      expect(filters.length).toEqual(0);
    });

    test('handles an event when aggregations type is a terms', async () => {
      (dataPoints[0].table.columns[0].meta.sourceParams as any).type = 'terms';
      const filters = await createFiltersFromValueClickAction({ data: dataPoints });

      expect(filters.length).toEqual(1);
      expect(filters[0].query?.match_phrase?.bytes).toEqual('2048');
    });

    test('handles an event when aggregations type is not terms', async () => {
      const filters = await createFiltersFromValueClickAction({ data: dataPoints });

      expect(filters.length).toEqual(1);

      const [rangeFilter] = filters as RangeFilter[];
      expect(rangeFilter.query.range.bytes.gte).toEqual(2048);
      expect(rangeFilter.query.range.bytes.lt).toEqual(2078);
    });

    test('handles non-unique filters', async () => {
      const [point] = dataPoints;
      const filters = await createFiltersFromValueClickAction({ data: [point, point] });

      expect(filters.length).toEqual(1);
    });
  });

  describe('createFilterESQL', () => {
    let table: Datatable;

    beforeEach(() => {
      table = {
        type: 'datatable',
        columns: [
          {
            name: 'test',
            id: '1-1',
            meta: {
              type: 'number',
              sourceParams: {
                sourceField: 'bytes',
              },
            },
          },
        ],
        rows: [
          {
            '1-1': '2048',
          },
        ],
      };
    });

    test('ignores event when sourceField is missing', async () => {
      table.columns[0].meta.sourceParams = {};
      const filter = await createFilterESQL(table, 0, 0);

      expect(filter).toEqual([]);
    });

    test('ignores event when value for rows is not provided', async () => {
      table.rows[0]['1-1'] = null;
      const filter = await createFilterESQL(table, 0, 0);

      expect(filter).toEqual([]);
    });

    test('handles an event when operation type is a date histogram', async () => {
      (table.columns[0].meta.sourceParams as any).operationType = 'date_histogram';
      const filter = await createFilterESQL(table, 0, 0);

      expect(filter).toMatchInlineSnapshot(`Array []`);
    });

    test('handles an event when operation type is histogram', async () => {
      (table.columns[0].meta.sourceParams as any).operationType = 'histogram';
      const filter = await createFilterESQL(table, 0, 0);

      expect(filter).toMatchInlineSnapshot(`Array []`);
    });

    test('handles an event when operation type is not date histogram', async () => {
      const filter = await createFilterESQL(table, 0, 0);

      expect(filter).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('appendFilterToESQLQueryFromValueClickAction', () => {
    let dataPoints: Parameters<typeof appendFilterToESQLQueryFromValueClickAction>[0]['data'];
    beforeEach(() => {
      dataPoints = [
        {
          table: {
            columns: [
              {
                name: 'columnA',
                id: 'columnA',
                meta: {
                  type: 'date',
                },
              },
            ],
            rows: [
              {
                columnA: '2048',
              },
            ],
          },
          column: 0,
          row: 0,
          value: 'test',
        },
      ];
    });
    test('should return null for date fields', async () => {
      const queryString = await appendFilterToESQLQueryFromValueClickAction({
        data: dataPoints,
        query: { esql: 'from meow' },
      });

      expect(queryString).toBeUndefined();
    });

    test('should return null if no aggregate query is present', async () => {
      dataPoints[0].table.columns[0] = {
        name: 'test',
        id: '1-1',
        meta: {
          type: 'string',
        },
      };
      const queryString = await appendFilterToESQLQueryFromValueClickAction({
        data: dataPoints,
      });

      expect(queryString).toBeUndefined();
    });

    test('should return the update query string', async () => {
      dataPoints[0].table.columns[0] = {
        name: 'columnA',
        id: 'columnA',
        meta: {
          type: 'string',
        },
      };
      const queryString = await appendFilterToESQLQueryFromValueClickAction({
        data: dataPoints,
        query: { esql: 'from meow' },
      });

      expect(queryString).toEqual(`from meow
| WHERE \`columnA\`=="2048"`);
    });

    test('should return the update query string for negated action', async () => {
      dataPoints[0].table.columns[0] = {
        name: 'columnA',
        id: 'columnA',
        meta: {
          type: 'string',
        },
      };
      const queryString = await appendFilterToESQLQueryFromValueClickAction({
        data: dataPoints,
        query: { esql: 'from meow' },
        negate: true,
      });

      expect(queryString).toEqual(`from meow
| WHERE \`columnA\`!="2048"`);
    });
  });
});
