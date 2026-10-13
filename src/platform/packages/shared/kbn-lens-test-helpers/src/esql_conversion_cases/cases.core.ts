/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlConversionCase } from './types';
import { count, dateHistogram, metric } from './columns';
import { createEsqlConversionCaseContext } from './fixtures';

export const buildCoreCases = (): EsqlConversionCase[] => {
  const { ecommerce, ecommerceFrom, ecommerceWhere, ecommerceWithoutTimeField } =
    createEsqlConversionCaseContext();

  return [
    {
      group: 'core',
      dataset: ecommerce,
      description: 'count of records',
      columns: { col1: count() },
      columnOrder: ['col1'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*)`,
        columnNames: ['COUNT(*)'],
        expectedSourceIds: { 'COUNT(*)': ['col1'] },
      },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'average of a numeric field',
      columns: { col1: metric('average', 'taxful_total_price') },
      columnOrder: ['col1'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS AVG(taxful_total_price)`,
        columnNames: ['AVG(taxful_total_price)'],
        expectedSourceIds: { 'AVG(taxful_total_price)': ['col1'] },
      },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'multiple metrics',
      columns: {
        col1: metric('average', 'taxful_total_price'),
        col2: metric('max', 'total_quantity'),
        col3: metric('median', 'products.base_price'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        // esql.col() backticks dotted field names.
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS AVG(taxful_total_price), MAX(total_quantity), MEDIAN(\`products.base_price\`)`,
        columnNames: [
          'AVG(taxful_total_price)',
          'MAX(total_quantity)',
          'MEDIAN(`products.base_price`)',
        ],
        expectedSourceIds: {
          'AVG(taxful_total_price)': ['col1'],
          'MAX(total_quantity)': ['col2'],
          'MEDIAN(`products.base_price`)': ['col3'],
        },
      },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'unique count of a keyword field',
      columns: {
        col1: {
          operationType: 'unique_count',
          sourceField: 'customer_id',
          label: 'Unique count of customer_id',
          dataType: 'number',
          isBucketed: false,
        },
      },
      columnOrder: ['col1'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT_DISTINCT(customer_id)`,
        columnNames: ['COUNT_DISTINCT(customer_id)'],
        expectedSourceIds: { 'COUNT_DISTINCT(customer_id)': ['col1'] },
      },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: '95th percentile of a numeric field',
      columns: {
        col1: {
          operationType: 'percentile',
          sourceField: 'taxful_total_price',
          label: '95th percentile of taxful_total_price',
          dataType: 'number',
          isBucketed: false,
          params: { percentile: 95 },
        },
      },
      columnOrder: ['col1'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS PERCENTILE(taxful_total_price, 95)`,
        columnNames: ['PERCENTILE(taxful_total_price, 95)'],
        expectedSourceIds: { 'PERCENTILE(taxful_total_price, 95)': ['col1'] },
      },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'metric with KQL filter',
      columns: {
        col1: count({ filter: { language: 'kuery', query: 'taxful_total_price >= 20' } }),
      },
      columnOrder: ['col1'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) WHERE KQL("taxful_total_price >= 20")`,
        columnNames: ['COUNT(*) WHERE KQL("taxful_total_price >= 20")'],
        expectedSourceIds: { 'COUNT(*) WHERE KQL("taxful_total_price >= 20")': ['col1'] },
      },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'metric with KQL filter containing escaped quotes',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: count({ filter: { language: 'kuery', query: 'customer_gender:"MALE"' } }),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) WHERE KQL("customer_gender:\\"MALE\\"") BY order_date = BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['COUNT(*) WHERE KQL("customer_gender:\\"MALE\\"")', 'order_date'],
        expectedSourceIds: {
          'COUNT(*) WHERE KQL("customer_gender:\\"MALE\\"")': ['col2'],
          order_date: ['col1'],
        },
      },
    },
    {
      group: 'core',
      dataset: ecommerceWithoutTimeField,
      description: 'no WHERE clause when the data view has no time field',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | STATS COUNT(*) BY order_date = BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['COUNT(*)', 'order_date'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          order_date: ['col1'],
        },
      },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'preserves user-configured currency format in esAggsIdMap',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: metric('sum', 'taxful_total_price', {
          params: { format: { id: 'currency', params: { decimals: 2, pattern: '$0,0.00' } } },
        }),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS SUM(taxful_total_price) BY order_date = BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['SUM(taxful_total_price)', 'order_date'],
        expectedSourceIds: {
          'SUM(taxful_total_price)': ['col2'],
          order_date: ['col1'],
        },
        expectedFormats: {
          'SUM(taxful_total_price)': {
            id: 'currency',
            params: { decimals: 2, pattern: '$0,0.00' },
          },
        },
      },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'preserves user-configured bytes format in esAggsIdMap',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: metric('average', 'taxful_total_price', {
          params: { format: { id: 'bytes', params: { decimals: 2 } } },
        }),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS AVG(taxful_total_price) BY order_date = BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['AVG(taxful_total_price)', 'order_date'],
        expectedSourceIds: {
          'AVG(taxful_total_price)': ['col2'],
          order_date: ['col1'],
        },
        expectedFormats: {
          'AVG(taxful_total_price)': { id: 'bytes', params: { decimals: 2 } },
        },
      },
    },
    // --- failure cases (unit-only; Scout consumers skip these) ---
    {
      group: 'core',
      dataset: ecommerce,
      description: 'formula is not convertible',
      columns: {
        col1: {
          operationType: 'formula',
          label: 'count() / 2',
          dataType: 'number',
          isBucketed: false,
        },
      },
      columnOrder: ['col1'],
      expected: { success: false, reason: 'formula_not_supported' },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'time shift is not convertible',
      columns: { col1: metric('average', 'taxful_total_price', { timeShift: '1h' }) },
      columnOrder: ['col1'],
      expected: { success: false, reason: 'time_shift_not_supported' },
    },
    {
      group: 'core',
      dataset: ecommerce,
      description: 'reduced time range is not convertible',
      columns: { col1: metric('average', 'taxful_total_price', { reducedTimeRange: '5m' }) },
      columnOrder: ['col1'],
      expected: { success: false, reason: 'reduced_time_range_not_supported' },
    },
  ];
};
