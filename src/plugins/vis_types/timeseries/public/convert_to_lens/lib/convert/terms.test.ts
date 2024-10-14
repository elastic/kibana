/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import {
  Operations,
  TermsColumn,
  TermsParams,
} from '@kbn/visualizations-plugin/common/convert_to_lens';
import { createSeries } from '../__mocks__';
import { convertToTermsColumn, convertToTermsParams } from './terms';
import { Column } from './types';

describe('convertToTermsParams', () => {
  const dataView = stubLogstashDataView;
  const series = createSeries();

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
  const secondaryFields = ['some-field-1', 'some-field-2'];
  const termsInclude = 'term-to-include';
  const termsExclude = 'term-to-exclude';
  const termsDirection = 'asc';
  const termsSize = 15;

  test.each<
    [
      string,
      Parameters<typeof convertToTermsParams>,
      Partial<Omit<TermsParams, 'orderAgg'> & { orderAgg: Partial<TermsParams['orderAgg']> }> | null
    ]
  >([
    [
      'count column orderAgg if not terms_order_by is set',
      [series, columns, []],
      {
        excludeIsRegex: false,
        includeIsRegex: false,
        orderAgg: {
          dataType: 'number',
          isBucketed: true,
          isSplit: false,
          operationType: 'count',
          params: {},
          sourceField: 'document',
        },
        orderDirection: 'desc',
      },
    ],
    [
      'count column orderAgg if terms_order_by is set to _count',
      [createSeries({ terms_order_by: '_count' }), columns, []],
      {
        excludeIsRegex: false,
        includeIsRegex: false,
        orderAgg: {
          dataType: 'number',
          isBucketed: true,
          isSplit: false,
          operationType: 'count',
          params: {},
          sourceField: 'document',
        },
        orderDirection: 'desc',
      },
    ],
    [
      'orderBy alphabetical if terms_order_by is set to _key',
      [createSeries({ terms_order_by: '_key' }), columns, []],
      {
        excludeIsRegex: false,
        includeIsRegex: false,
        orderBy: { type: 'alphabetical' },
        orderDirection: 'desc',
        size: 10,
      },
    ],
    [
      'column as orderAgg if terms_order_by is set to metric id',
      [createSeries({ terms_order_by: metricId1 }), columns, []],
      {
        excludeIsRegex: false,
        includeIsRegex: false,
        orderAgg: {
          columnId: 'some-id-0',
        },
        orderBy: { columnId: 'some-id-0', type: 'column' },
        orderDirection: 'desc',
      },
    ],
    [
      'null if terms_order_by is set not set to valid metric id',
      [createSeries({ terms_order_by: 'some-invalid-id' }), columns, []],
      null,
    ],
    [
      'respect all the args',
      [
        createSeries({
          terms_order_by: metricId1,
          terms_include: termsInclude,
          terms_exclude: termsExclude,
          terms_direction: termsDirection,
          terms_size: `${termsSize}`,
        }),
        columns,
        secondaryFields,
      ],
      {
        exclude: [termsExclude],
        excludeIsRegex: true,
        include: [termsInclude],
        includeIsRegex: true,
        orderAgg: {
          columnId: 'some-id-0',
          dataType: 'number',
          isBucketed: true,
          isSplit: false,
          operationType: 'average',
          params: {},
          sourceField: 'bytes',
        },
        orderBy: { columnId: 'some-id-0', type: 'column' },
        orderDirection: termsDirection,
        otherBucket: false,
        parentFormat: { id: 'terms' },
        secondaryFields,
        size: termsSize,
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToTermsParams(...input)).toBeNull();
    } else {
      expect(convertToTermsParams(...input)).toEqual(
        expect.objectContaining({
          ...expected,
          ...(expected.orderAgg ? { orderAgg: expect.objectContaining(expected.orderAgg) } : {}),
        })
      );
    }
  });
});

describe('converToTermsColumn', () => {
  const dataView = stubLogstashDataView;

  const series = createSeries();

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

  const secondaryFields = ['some-field-1', 'some-field-2'];
  const termsInclude = 'term-to-include';
  const termsExclude = 'term-to-exclude';
  const termsDirection = 'asc';
  const termsSize = 15;

  test.each<
    [
      string,
      Parameters<typeof convertToTermsColumn>,
      Partial<
        Omit<TermsColumn, 'params'> & {
          params: Partial<Omit<TermsColumn['params'], 'orderAgg'>> & {
            orderAgg: Partial<TermsColumn['params']['orderAgg']>;
          };
        }
      > | null
    ]
  >([
    ['null if base field is not valid', [[''], series, columns, dataView, false], null],
    [
      'null if terms_order_by is invalid',
      [
        [dataView.fields[0].name],
        createSeries({ terms_order_by: 'some-invalid-id' }),
        columns,
        dataView,
        false,
      ],
      null,
    ],
    [
      'terms colum',
      [
        [dataView.fields[0].name, ...secondaryFields],
        createSeries({
          terms_order_by: metricId1,
          terms_include: termsInclude,
          terms_exclude: termsExclude,
          terms_direction: termsDirection,
          terms_size: `${termsSize}`,
        }),
        columns,
        dataView,
        true,
      ],
      {
        isBucketed: true,
        isSplit: true,
        operationType: 'terms',
        params: {
          exclude: [termsExclude],
          excludeIsRegex: true,
          include: [termsInclude],
          includeIsRegex: true,
          orderAgg: {
            columnId: 'some-id-0',
            dataType: 'number',
            isBucketed: true,
            isSplit: false,
            operationType: 'average',
            params: {},
            sourceField: 'bytes',
          },
          orderBy: { columnId: 'some-id-0', type: 'column' },
          orderDirection: termsDirection,
          otherBucket: false,
          parentFormat: { id: 'terms' },
          secondaryFields,
          size: termsSize,
        },
        sourceField: 'bytes',
      },
    ],
  ])('should return %s', (_, input, expected) => {
    if (expected === null) {
      expect(convertToTermsColumn(...input)).toBeNull();
    } else {
      expect(convertToTermsColumn(...input)).toEqual(
        expect.objectContaining({
          ...expected,
          params: expect.objectContaining({
            ...expected.params,
            ...(expected.params?.orderAgg
              ? { orderAgg: expect.objectContaining(expected.params.orderAgg) }
              : {}),
          }),
        })
      );
    }
  });
});
