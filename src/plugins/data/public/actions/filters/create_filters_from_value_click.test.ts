/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  fieldFormats,
  FieldFormatsGetConfigFn,
  esFilters,
  IndexPatternsContract,
} from '../../../public';
import { dataPluginMock } from '../../../public/mocks';
import { setIndexPatterns, setSearchService } from '../../../public/services';
import {
  createFiltersFromValueClickAction,
  ValueClickDataContext,
} from './create_filters_from_value_click';

const mockField = {
  name: 'bytes',
  filterable: true,
};

describe('createFiltersFromValueClick', () => {
  let dataPoints: ValueClickDataContext['data'];

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

    const dataStart = dataPluginMock.createStartContract();
    setSearchService(dataStart.search);
    setIndexPatterns(({
      ...dataStart.indexPatterns,
      get: async () => ({
        id: 'logstash-*',
        fields: {
          getByName: () => mockField,
          filter: () => [mockField],
        },
        getFormatterForField: () =>
          new fieldFormats.BytesFormat({}, (() => {}) as FieldFormatsGetConfigFn),
      }),
    } as unknown) as IndexPatternsContract);
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
    expect(filters[0].query.match_phrase.bytes).toEqual('2048');
  });

  test('handles an event when aggregations type is not terms', async () => {
    const filters = await createFiltersFromValueClickAction({ data: dataPoints });

    expect(filters.length).toEqual(1);

    const [rangeFilter] = filters;

    if (esFilters.isRangeFilter(rangeFilter)) {
      expect(rangeFilter.range.bytes.gte).toEqual(2048);
      expect(rangeFilter.range.bytes.lt).toEqual(2078);
    }
  });
});
