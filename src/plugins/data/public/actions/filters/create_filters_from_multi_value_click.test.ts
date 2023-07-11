/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { dataPluginMock } from '../../mocks';
import { setIndexPatterns, setSearchService } from '../../services';
import { createFiltersFromMultiValueClickAction } from './create_filters_from_multi_value_click';
import { FieldFormatsGetConfigFn, BytesFormat } from '@kbn/field-formats-plugin/common';

const mockField = {
  name: 'bytes',
  filterable: true,
};

describe('createFiltersFromMultiValueClickAction', () => {
  let dataPoints: Parameters<typeof createFiltersFromMultiValueClickAction>[0]['data'];

  beforeEach(() => {
    dataPoints = {
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
        meta: {
          source: 'dataview-1',
          type: 'esaggs',
        },
      },
      column: 0,
      value: ['2048'],
    };

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
    dataPoints.table.rows[0]['1-1'] = null;
    const filters = await createFiltersFromMultiValueClickAction({ data: dataPoints });

    expect(filters).toBeUndefined();
  });

  test('ignores event when dataview id is not provided', async () => {
    dataPoints.table.meta = undefined;
    const filters = await createFiltersFromMultiValueClickAction({ data: dataPoints });

    expect(filters).toBeUndefined();
  });

  test('handles an event when aggregations type is a terms', async () => {
    (dataPoints.table.columns[0].meta.sourceParams as any).type = 'terms';
    const filters = await createFiltersFromMultiValueClickAction({ data: dataPoints });

    expect(filters?.query?.match_phrase?.bytes).toEqual('2048');
  });

  test('handles an event when aggregations type is not terms', async () => {
    const filters = await createFiltersFromMultiValueClickAction({ data: dataPoints });

    expect(filters?.query?.range.bytes.gte).toEqual(2048);
    expect(filters?.query?.range.bytes.lt).toEqual(2078);
  });
});
