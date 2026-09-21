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

export const buildDateHistogramCases = (): EsqlConversionCase[] => {
  const { ecommerce, ecommerceFrom, ecommerceWhere } = createEsqlConversionCaseContext();

  return [
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram (auto interval) with count',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 75, ?_tstart, ?_tend)'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          'BUCKET(order_date, 75, ?_tstart, ?_tend)': ['col1'],
        },
      },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram (fixed interval) with average',
      columns: {
        col1: dateHistogram('order_date', { interval: '1h' }),
        col2: metric('average', 'taxful_total_price'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS AVG(taxful_total_price) BY BUCKET(order_date, 1 hour)`,
        columnNames: ['AVG(taxful_total_price)', 'BUCKET(order_date, 1 hour)'],
        expectedSourceIds: {
          'AVG(taxful_total_price)': ['col2'],
          'BUCKET(order_date, 1 hour)': ['col1'],
        },
      },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram falls back to auto when interval param is missing',
      columns: {
        col1: dateHistogram('order_date', {}),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 75, ?_tstart, ?_tend)'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          'BUCKET(order_date, 75, ?_tstart, ?_tend)': ['col1'],
        },
      },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram (auto interval) falls back to 1 hour without a date range',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      omitDateRange: true,
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY BUCKET(order_date, 1 hour)`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 1 hour)'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          'BUCKET(order_date, 1 hour)': ['col1'],
        },
      },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram (fixed 30m interval) with count',
      columns: {
        col1: dateHistogram('order_date', { interval: '30m' }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY BUCKET(order_date, 30 minutes)`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 30 minutes)'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          'BUCKET(order_date, 30 minutes)': ['col1'],
        },
      },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram (fixed 1d interval) with count',
      columns: {
        col1: dateHistogram('order_date', { interval: '1d' }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY BUCKET(order_date, 1 day)`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 1 day)'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          'BUCKET(order_date, 1 day)': ['col1'],
        },
      },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram prepends YYYY-MM-DD to time-only format when range > 24h',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      uiSettingsOverrides: { dateFormat: 'HH:mm:ss' },
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 75, ?_tstart, ?_tend)'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          'BUCKET(order_date, 75, ?_tstart, ?_tend)': ['col1'],
        },
        expectedFormats: {
          'BUCKET(order_date, 75, ?_tstart, ?_tend)': {
            id: 'date',
            params: { pattern: 'YYYY-MM-DD HH:mm:ss' },
          },
        },
      },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram does not prepend YYYY-MM-DD to time-only format when range <= 24h',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto' }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      uiSettingsOverrides: { dateFormat: 'HH:mm:ss' },
      dateRangeOverride: {
        fromDate: '2023-06-16T00:00:00.000Z',
        toDate: '2023-06-16T06:00:00.000Z',
      },
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 75, ?_tstart, ?_tend)'],
        expectedSourceIds: {
          'COUNT(*)': ['col2'],
          'BUCKET(order_date, 75, ?_tstart, ?_tend)': ['col1'],
        },
        expectedFormats: {
          'BUCKET(order_date, 75, ?_tstart, ?_tend)': {
            id: 'date',
            params: { pattern: 'HH:mm:ss' },
          },
        },
      },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram with drop partial buckets is not convertible',
      columns: {
        col1: dateHistogram('order_date', { interval: 'auto', dropPartials: true }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      expected: { success: false, reason: 'drop_partials_not_supported' },
    },
    {
      group: 'date_histogram',
      dataset: ecommerce,
      description: 'date histogram with include empty rows is not convertible',
      columns: {
        col1: dateHistogram('order_date', { interval: '1h', includeEmptyRows: true }),
        col2: count(),
      },
      columnOrder: ['col1', 'col2'],
      expected: { success: false, reason: 'include_empty_rows_not_supported' },
    },
  ];
};
