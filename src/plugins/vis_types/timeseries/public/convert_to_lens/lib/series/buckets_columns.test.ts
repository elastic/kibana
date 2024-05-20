/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { Operations, TermsParams } from '@kbn/visualizations-plugin/common';
import { Column } from '../convert';
import { createPanel, createSeries } from '../__mocks__';
import { getBucketsColumns, isSplitWithDateHistogram } from './buckets_columns';

describe('isSplitWithDateHistogram', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries({ terms_field: dataView.fields[0].name, split_mode: 'terms' });
  const splitFieldsWithMultipleDateFields = [dataView.fields[0].name, dataView.fields[2].name];
  test.each<[string, Parameters<typeof isSplitWithDateHistogram>, boolean | null]>([
    [
      'null if split_mode is terms, terms_field is specified and splitFields contains date field and others',
      [series, splitFieldsWithMultipleDateFields, dataView],
      null,
    ],
    [
      'true if split_mode is terms, terms_field is specified and splitFields contains date field',
      [series, [dataView.fields[2].name], dataView],
      true,
    ],
    [
      'false if no terms field is specified',
      [createSeries({ split_mode: 'terms' }), splitFieldsWithMultipleDateFields, dataView],
      false,
    ],
    [
      'false if split_mode is not terms',
      [
        createSeries({ terms_field: dataView.fields[0].name, split_mode: 'some-split-mode' }),
        splitFieldsWithMultipleDateFields,
        dataView,
      ],
      false,
    ],
    ['false if splitFields array is empty', [series, [], dataView], false],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(isSplitWithDateHistogram(...input)).toBeNull();
    } else {
      expect(isSplitWithDateHistogram(...input)).toBe(expected);
    }
  });
});

describe('getBucketsColumns', () => {
  const dataView = stubLogstashDataView;
  const seriesWithoutSplitMode = createSeries({ split_mode: '' });
  const seriesWithFilterSplitMode = createSeries({
    split_mode: 'filter',
    filter: { language: 'lucene', query: 'some query' },
  });

  const seriesWithFiltersSplitMode = createSeries({
    split_mode: 'filters',
    split_filters: [
      { id: 'filter1', label: 'filter label', filter: { language: 'lucene', query: 'some query' } },
    ],
  });

  const seriesWithTermsSplitMode = createSeries({
    split_mode: 'terms',
    terms_field: [dataView.fields[2].name],
  });
  const seriesWithTermsSplitModeAndMultipleTermsFields = createSeries({
    split_mode: 'terms',
    terms_field: [dataView.fields[0].name, dataView.fields[2].name],
  });
  const seriesWithTermsSplitModeAndEmptySplitFields = createSeries({
    split_mode: 'terms',
    terms_field: undefined,
  });
  const series = createSeries({
    terms_field: [dataView.fields[0].name, dataView.fields[1].name],
    split_mode: 'terms',
  });

  const metricId1 = 'metric-id-1';
  const metricId2 = 'metric-id-2';
  const columns: Column[] = [
    {
      operationType: Operations.AVERAGE,
      sourceField: dataView.fields[0].name,
      columnId: 'some-id-0',
      dataType: 'number',
      params: {},
      meta: { metricId: metricId1 },
      isSplit: false,
      isBucketed: true,
    },
    {
      operationType: Operations.SUM,
      sourceField: dataView.fields[0].name,
      columnId: 'some-id-1',
      dataType: 'number',
      params: {},
      meta: { metricId: metricId2 },
      isSplit: false,
      isBucketed: true,
    },
  ];
  test.each<
    [
      string,
      Parameters<typeof getBucketsColumns>,
      Array<Partial<Exclude<Column, 'params'> & { params: Partial<Column['params']> }>> | null
    ]
  >([
    [
      'empty array if split_mode is not set',
      [
        createPanel({ series: [seriesWithoutSplitMode] }),
        seriesWithoutSplitMode,
        columns,
        dataView,
      ],
      [],
    ],
    [
      'filters column if split_mode is filter',
      [
        createPanel({ series: [seriesWithFilterSplitMode] }),
        seriesWithFilterSplitMode,
        columns,
        dataView,
      ],
      [
        {
          dataType: 'string',
          isBucketed: true,
          isSplit: true,
          operationType: 'filters',
          params: { filters: [{ input: { language: 'lucene', query: 'some query' }, label: '' }] },
        },
      ],
    ],
    [
      'filters column if split_mode is filters',
      [
        createPanel({ series: [seriesWithFiltersSplitMode] }),
        seriesWithFiltersSplitMode,
        columns,
        dataView,
      ],
      [
        {
          dataType: 'string',
          isBucketed: true,
          isSplit: true,
          operationType: 'filters',
          params: {
            filters: [
              { input: { language: 'lucene', query: 'some query' }, label: 'filter label' },
            ],
          },
        },
      ],
    ],
    [
      'datehistogram column if split_mode is terms and terms_field contains single field which is date',
      [
        createPanel({ series: [seriesWithTermsSplitMode] }),
        seriesWithTermsSplitMode,
        columns,
        dataView,
      ],
      [
        {
          dataType: 'date',
          isBucketed: true,
          isSplit: true,
          operationType: 'date_histogram',
          params: { dropPartials: false, includeEmptyRows: true, interval: 'auto' },
          sourceField: '@timestamp',
        },
      ],
    ],
    [
      'null if split_mode is terms and terms_field contains date field and others (unsupported)',
      [
        createPanel({ series: [seriesWithTermsSplitModeAndMultipleTermsFields] }),
        seriesWithTermsSplitModeAndMultipleTermsFields,
        columns,
        dataView,
      ],
      null,
    ],
    [
      'null if split_mode is terms and terms_field is empty (unsupported)',
      [
        createPanel({ series: [seriesWithTermsSplitModeAndEmptySplitFields] }),
        seriesWithTermsSplitModeAndEmptySplitFields,
        columns,
        dataView,
      ],
      null,
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(getBucketsColumns(...input)).toBeNull();
    } else if (Array.isArray(expected)) {
      expect(getBucketsColumns(...input)).toEqual(expected.map(expect.objectContaining));
    } else {
      expect(getBucketsColumns(...input)).toEqual(expect.objectContaining(expected));
    }
  });

  test("should return terms column if split_mode is terms and terms_field doesn't contain date field", () => {
    const result = getBucketsColumns(createPanel({ series: [series] }), series, columns, dataView);

    expect(Array.isArray(result)).toBeTruthy();
    expect(result?.length).toBe(1);
    expect(result?.[0]).toEqual(
      expect.objectContaining({
        dataType: 'number',
        isBucketed: true,
        isSplit: false,
        operationType: 'terms',
        params: expect.objectContaining({
          excludeIsRegex: false,
          includeIsRegex: false,
          orderAgg: expect.objectContaining({
            dataType: 'number',
            isBucketed: true,
            isSplit: false,
            operationType: 'count',
            params: {},
            sourceField: 'document',
          }),
          orderBy: expect.objectContaining({ type: 'custom' }),
          orderDirection: 'desc',
          otherBucket: false,
          parentFormat: { id: 'terms' },
          secondaryFields: ['ssl'],
          size: 10,
        }),
        sourceField: 'bytes',
      })
    );
    const params = result?.[0].params as TermsParams;
    expect(params.orderAgg).not.toBeNull();
    expect(typeof params.orderAgg === 'object').toBeTruthy();
  });
});
