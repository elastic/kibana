/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlConversionCase, EsqlConversionDataset } from './types';
import { dateHistogram, metric } from './columns';
import { createEsqlConversionCaseContext } from './fixtures';

export const buildDuplicateCases = (): EsqlConversionCase[] => {
  const { logs, logsFrom, logsWhere } = createEsqlConversionCaseContext();
  const logsWithoutTimeField: EsqlConversionDataset = { ...logs, timeField: undefined };

  return [
    {
      group: 'duplicates',
      dataset: logsWithoutTimeField,
      description: 'duplicate metric maps two source columns to one output',
      columns: {
        col1: metric('average', 'bytes'),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | STATS AVG(bytes)`,
        columnNames: ['AVG(bytes)'],
        expectedSourceIds: { 'AVG(bytes)': ['col1', 'col2'] },
      },
    },
    {
      group: 'duplicates',
      dataset: logsWithoutTimeField,
      description: 'duplicate metric maps three source columns to one output',
      columns: {
        col1: metric('average', 'bytes'),
        col2: metric('average', 'bytes'),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | STATS AVG(bytes)`,
        columnNames: ['AVG(bytes)'],
        expectedSourceIds: { 'AVG(bytes)': ['col1', 'col2', 'col3'] },
      },
    },
    {
      group: 'duplicates',
      dataset: logsWithoutTimeField,
      description: 'duplicate metrics preserve individual custom labels',
      columns: {
        col1: metric('average', 'bytes', { label: 'Primary', customLabel: true }),
        col2: metric('average', 'bytes', { label: 'Secondary', customLabel: true }),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | STATS AVG(bytes)`,
        columnNames: ['AVG(bytes)'],
        expectedSourceIds: { 'AVG(bytes)': ['col1', 'col2'] },
        expectedLabels: { 'AVG(bytes)': ['Primary', 'Secondary'] },
      },
    },
    {
      group: 'duplicates',
      dataset: logsWithoutTimeField,
      description: 'filtered metric stays separate from an identical bare metric',
      columns: {
        col1: metric('average', 'bytes'),
        col2: metric('average', 'bytes', {
          filter: { query: 'bytes > 100', language: 'kuery' },
        }),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | STATS AVG(bytes), AVG(bytes) WHERE KQL("bytes > 100")`,
        columnNames: ['AVG(bytes)', 'AVG(bytes) WHERE KQL("bytes > 100")'],
        expectedSourceIds: {
          'AVG(bytes)': ['col1'],
          'AVG(bytes) WHERE KQL("bytes > 100")': ['col2'],
        },
      },
    },
    {
      group: 'duplicates',
      dataset: logsWithoutTimeField,
      description: 'aliased metric stays separate from an identical bare metric',
      columns: {
        col1: metric('max', 'bytes'),
        col2: metric('max', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      columnRoles: { col2: 'max_value' },
      expected: {
        success: true,
        esql: `${logsFrom} | STATS MAX(bytes), max_value = MAX(bytes)`,
        columnNames: ['MAX(bytes)', 'max_value'],
        expectedSourceIds: { 'MAX(bytes)': ['col1'], max_value: ['col2'] },
      },
    },
    {
      group: 'duplicates',
      dataset: logs,
      description: 'duplicate metric is emitted once alongside a bucket',
      columns: {
        col1: dateHistogram('timestamp', { interval: 'auto' }),
        col2: metric('average', 'bytes'),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | STATS AVG(bytes) BY timestamp = BUCKET(timestamp, 75, ?_tstart, ?_tend)`,
        columnNames: ['AVG(bytes)', 'timestamp'],
        expectedSourceIds: {
          'AVG(bytes)': ['col2', 'col3'],
          timestamp: ['col1'],
        },
      },
    },
    {
      group: 'duplicates',
      dataset: logs,
      description: 'duplicate bucket maps two source columns to one output',
      columns: {
        col1: dateHistogram('timestamp', { interval: 'auto' }),
        col2: dateHistogram('timestamp', { interval: 'auto' }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | STATS AVG(bytes) BY timestamp = BUCKET(timestamp, 75, ?_tstart, ?_tend)`,
        columnNames: ['AVG(bytes)', 'timestamp'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          timestamp: ['col1', 'col2'],
        },
      },
    },
  ];
};
