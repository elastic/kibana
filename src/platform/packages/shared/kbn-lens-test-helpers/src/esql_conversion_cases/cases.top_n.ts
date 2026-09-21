/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlConversionCase } from './types';
import { count, dateHistogram, metric, terms } from './columns';
import { createEsqlConversionCaseContext } from './fixtures';

export const buildTopNCases = (): EsqlConversionCase[] => {
  const { logs, logsFrom, logsWhere } = createEsqlConversionCaseContext();

  // Restricts the query to the top values of an outer dimension, which `LIMIT n BY` cannot do.
  const outerTopNFilter = ({
    field,
    score,
    sort,
    size,
  }: {
    field: string;
    score: string;
    sort: string;
    size: number;
  }) =>
    `WHERE ${field} IN (${logsFrom} | ${logsWhere} | STATS ${score} BY ${field} | SORT ${sort} | LIMIT ${size} | KEEP ${field})`;

  return [
    {
      group: 'top_n',
      dataset: logs,
      description: 'top values ordered by metric column',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col2' },
          orderDirection: 'desc',
        }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | STATS AVG(bytes) BY host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3`,
        columnNames: ['AVG(bytes)', 'host.keyword'],
        expectedSourceIds: { 'AVG(bytes)': ['col2'], 'host.keyword': ['col1'] },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'top values ordered alphabetically',
      columns: {
        col1: terms('host.keyword', { size: 5, orderBy: { type: 'alphabetical' } }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | STATS AVG(bytes) BY host.keyword | SORT host.keyword ASC | LIMIT 5`,
        columnNames: ['AVG(bytes)', 'host.keyword'],
        expectedSourceIds: { 'AVG(bytes)': ['col2'], 'host.keyword': ['col1'] },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'top values sorted by metric alias when column roles are provided',
      columns: {
        col1: terms('host.keyword', {
          orderBy: { type: 'column', columnId: 'col2' },
          orderDirection: 'desc',
        }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      columnRoles: { col2: 'avg_bytes' },
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | STATS avg_bytes = AVG(bytes) BY host.keyword | SORT avg_bytes DESC | LIMIT 5`,
        columnNames: ['avg_bytes', 'host.keyword'],
        expectedSourceIds: { avg_bytes: ['col2'], 'host.keyword': ['col1'] },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms ordered by a missing column is not convertible',
      columns: {
        col1: terms('host.keyword', {
          orderBy: { type: 'column', columnId: 'missing-metric' },
          orderDirection: 'desc',
        }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: { success: false, reason: 'terms_order_by_not_supported' },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with rare ranking is not convertible',
      columns: {
        col1: terms('host.keyword', { orderBy: { type: 'rare', maxDocCount: 3 } }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: { success: false, reason: 'terms_order_by_not_supported' },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket is not convertible',
      columns: {
        col1: terms('host.keyword', { otherBucket: true }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: { success: false, reason: 'terms_other_bucket_not_supported' },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms alongside a second bucket dimension is not convertible',
      columns: {
        col1: terms('host.keyword', {}),
        col2: dateHistogram('timestamp', { interval: '1h' }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: { success: false, reason: 'terms_not_supported' },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'three terms dimensions are not convertible',
      columns: {
        col1: terms('geo.src', {}),
        col2: terms('geo.dest', {}),
        col3: terms('host.keyword', {}),
        col4: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3', 'col4'],
      expected: { success: false, reason: 'terms_multi_level_not_supported' },
    },
    // Multi-terms parity has three parts: the outer dimension keeps only its top values,
    // `LIMIT n BY` keeps the inner top values per outer value, and a second SORT applies the
    // outer ordering that the leading SORT cannot express because `LIMIT BY` consumes it.
    {
      group: 'top_n',
      dataset: logs,
      description: 'two terms both ranked by metric DESC',
      columns: {
        col1: terms('geo.src', {
          size: 5,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'geo.src',
          score: 'AVG(bytes)',
          sort: '`AVG(bytes)` DESC',
          size: 5,
        })} | STATS AVG(bytes) BY geo.src, host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3 BY geo.src | SORT \`AVG(bytes)\` DESC`,
        columnNames: ['AVG(bytes)', 'geo.src', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'geo.src': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'outer alphabetical, inner metric',
      columns: {
        col1: terms('geo.src', {
          size: 5,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
        }),
        col2: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'geo.src',
          score: 'COUNT(*)',
          sort: 'geo.src ASC',
          size: 5,
        })} | STATS AVG(bytes) BY geo.src, host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3 BY geo.src | SORT geo.src ASC, \`AVG(bytes)\` DESC`,
        columnNames: ['AVG(bytes)', 'geo.src', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'geo.src': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'both dimensions alphabetical',
      columns: {
        col1: terms('geo.src', {
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
        }),
        col2: terms('host.keyword', {
          size: 4,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'desc',
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'geo.src',
          score: 'COUNT(*)',
          sort: 'geo.src ASC',
          size: 5,
        })} | STATS AVG(bytes) BY geo.src, host.keyword | SORT host.keyword DESC | LIMIT 4 BY geo.src | SORT geo.src ASC, host.keyword DESC`,
        columnNames: ['AVG(bytes)', 'geo.src', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'geo.src': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description:
        'both dimensions ranked by the same metric in opposite directions — outer direction wins',
      columns: {
        col1: terms('geo.src', {
          size: 5,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'asc',
        }),
        col2: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'geo.src',
          score: 'AVG(bytes)',
          sort: '`AVG(bytes)` ASC',
          size: 5,
        })} | STATS AVG(bytes) BY geo.src, host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3 BY geo.src | SORT \`AVG(bytes)\` ASC`,
        columnNames: ['AVG(bytes)', 'geo.src', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'geo.src': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
  ];
};
