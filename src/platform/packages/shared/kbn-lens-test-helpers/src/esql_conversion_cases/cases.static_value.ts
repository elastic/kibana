/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlConversionCase } from './types';
import { count, dateHistogram, metric, staticValue } from './columns';
import { createEsqlConversionCaseContext } from './fixtures';

export const buildStaticValueCases = (): EsqlConversionCase[] => {
  const { ecommerce, ecommerceFrom, ecommerceWhere, ecommerceWithoutTimeField } =
    createEsqlConversionCaseContext();

  return [
    {
      group: 'static_value',
      dataset: ecommerce,
      description: 'static value converts to EVAL after STATS',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: count(),
        col3: staticValue('100'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY order_date = BUCKET(order_date, 75, ?_tstart, ?_tend) | EVAL static_value = 100`,
        columnNames: ['COUNT(*)', 'order_date', 'static_value'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          order_date: ['col1'],
          static_value: ['col3'],
        },
      },
    },
    {
      group: 'static_value',
      dataset: ecommerceWithoutTimeField,
      description: 'static value without other metrics',
      columns: { col1: staticValue('50') },
      columnOrder: ['col1'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | EVAL static_value = 50`,
        columnNames: ['static_value'],
        expectedSourceIds: { static_value: ['col1'] },
        allowAdditionalColumns: true,
      },
    },
    {
      group: 'static_value',
      dataset: ecommerceWithoutTimeField,
      description: 'static value uses semantic role name from column roles',
      columns: {
        col1: count(),
        col2: staticValue('100'),
      },
      columnOrder: ['col1', 'col2'],
      columnRoles: { col2: 'max_value' },
      expected: {
        success: true,
        esql: `${ecommerceFrom} | STATS COUNT(*) | EVAL static_max_value = 100`,
        columnNames: ['COUNT(*)', 'static_max_value'],
        expectedSourceIds: { 'COUNT(*)': ['col1'], static_max_value: ['col2'] },
      },
    },
    {
      group: 'static_value',
      dataset: ecommerceWithoutTimeField,
      description: 'multiple static values use indexed names',
      columns: {
        col1: staticValue('100'),
        col2: staticValue('200'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | EVAL static_value_0 = 100, static_value_1 = 200`,
        columnNames: ['static_value_0', 'static_value_1'],
        expectedSourceIds: { static_value_0: ['col1'], static_value_1: ['col2'] },
        allowAdditionalColumns: true,
      },
    },
    {
      group: 'static_value',
      dataset: ecommerceWithoutTimeField,
      description: 'filtered max metric with column role gets semantic name and keeps label',
      columns: {
        col1: metric('sum', 'taxful_total_price'),
        col2: metric('max', 'taxful_total_price', {
          label: 'Maximum of taxful_total_price',
          filter: { language: 'kuery', query: 'taxful_total_price > 100' },
        }),
      },
      columnOrder: ['col1', 'col2'],
      columnRoles: { col2: 'max_value' },
      expected: {
        success: true,
        esql: `${ecommerceFrom} | STATS SUM(taxful_total_price), max_value = MAX(taxful_total_price) WHERE KQL("taxful_total_price > 100")`,
        columnNames: ['SUM(taxful_total_price)', 'max_value'],
        expectedSourceIds: { 'SUM(taxful_total_price)': ['col1'], max_value: ['col2'] },
        expectedLabels: { max_value: ['Maximum of taxful_total_price'] },
      },
    },
    {
      group: 'static_value',
      dataset: ecommerce,
      description: 'static value with semantic role plus metric',
      columns: {
        col1: metric('average', 'taxful_total_price'),
        col2: {
          operationType: 'static_value',
          label: 'Static value: 100',
          dataType: 'number',
          isBucketed: false,
          params: { value: '100' },
        },
      },
      columnOrder: ['col1', 'col2'],
      columnRoles: { col2: 'max_value' },
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS AVG(taxful_total_price) | EVAL static_max_value = 100`,
        columnNames: ['AVG(taxful_total_price)', 'static_max_value'],
        expectedSourceIds: {
          'AVG(taxful_total_price)': ['col1'],
          static_max_value: ['col2'],
        },
      },
    },
  ];
};
