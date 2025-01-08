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
import { createFiltersFromMultiValueClickAction } from './create_filters_from_multi_value_click';
import { FieldFormatsGetConfigFn, BytesFormat } from '@kbn/field-formats-plugin/common';
import { Datatable } from '@kbn/expressions-plugin/common';
import { BooleanRelation, Filter } from '@kbn/es-query';

const mockField = {
  name: 'bytes',
  filterable: true,
};

let table: Pick<Datatable, 'columns' | 'rows' | 'meta'>;

describe('createFiltersFromMultiValueClickAction', () => {
  let dataPoints: Parameters<typeof createFiltersFromMultiValueClickAction>[0]['data'];

  beforeEach(() => {
    table = {
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
        {
          name: 'avg',
          id: '2-2',
          meta: {
            type: 'number',
            source: 'esaggs',
            sourceParams: {
              indexPatternId: 'logstash-*',
              type: 'average',
              params: {
                field: 'bytes',
              },
            },
          },
        },
      ],
      rows: [
        {
          '1-1': 1691189380,
          '2-2': 2048,
        },
        {
          '1-1': 1691189680,
          '2-2': 90,
        },
      ],
      meta: {
        source: 'dataview-1',
        type: 'esaggs',
      },
    };
    dataPoints = [
      {
        table,
        cells: [
          {
            column: 0,
            row: 0,
          },
        ],
      },
    ];

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
  });

  test('ignores event when value for rows is not provided', async () => {
    dataPoints[0].table.rows[0]['1-1'] = null;
    const filters = await createFiltersFromMultiValueClickAction({ data: dataPoints });

    expect(filters).toBeUndefined();
  });

  test('ignores event when dataview id is not provided', async () => {
    dataPoints[0].table.meta = undefined;
    const filters = await createFiltersFromMultiValueClickAction({ data: dataPoints });

    expect(filters).toBeUndefined();
  });

  test('handles an event when aggregations type is a terms', async () => {
    (dataPoints[0].table.columns[0].meta.sourceParams as any).type = 'terms';
    const filters = (await createFiltersFromMultiValueClickAction({
      data: dataPoints,
    })) as Filter[];

    expect(filters[0]?.query?.match_phrase?.bytes).toEqual(1691189380);
  });

  test('handles an event when aggregations type is not terms', async () => {
    const filters = (await createFiltersFromMultiValueClickAction({
      data: dataPoints,
    })) as Filter[];

    expect(filters[0]?.query?.range.bytes.gte).toEqual(1691189380);
    expect(filters[0]?.query?.range.bytes.lt).toEqual(1691189410);
  });
  test('creates combined filters if relation is passed', async () => {
    dataPoints[0].cells = [
      {
        column: 0,
        row: 0,
      },
      {
        column: 0,
        row: 1,
      },
    ];
    dataPoints[0].relation = BooleanRelation.OR;
    const filters = (await createFiltersFromMultiValueClickAction({
      data: dataPoints,
    })) as Filter[];
    expect(filters.length).toEqual(1);
    expect(filters[0]?.meta.type).toEqual('combined');
  });
  test('creates separate filters if relation is not passed', async () => {
    dataPoints[0].cells = [
      {
        column: 0,
        row: 0,
      },
      {
        column: 0,
        row: 1,
      },
    ];
    const filters = (await createFiltersFromMultiValueClickAction({
      data: dataPoints,
    })) as Filter[];
    expect(filters.length).toEqual(2);
  });
  test('creates separate filters for multiple tables', async () => {
    dataPoints = [
      {
        table,
        cells: [
          {
            column: 0,
            row: 0,
          },
        ],
      },
      {
        table,
        cells: [
          {
            column: 0,
            row: 1,
          },
        ],
      },
    ];
    const filters = (await createFiltersFromMultiValueClickAction({
      data: dataPoints,
    })) as Filter[];
    expect(filters.length).toEqual(2);
  });
  test('doesnt combine duplicate filters', async () => {
    dataPoints = [
      {
        table,
        cells: [
          {
            column: 0,
            row: 0,
          },
          {
            column: 0,
            row: 0,
          },
        ],
        relation: BooleanRelation.OR,
      },
    ];
    const filters = (await createFiltersFromMultiValueClickAction({
      data: dataPoints,
    })) as Filter[];
    expect(filters.length).toEqual(1);
    expect(filters[0]?.meta?.type).toEqual('range');
  });
});
