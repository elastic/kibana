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
  const {
    ecommerce,
    ecommerceFrom,
    ecommerceWhere,
    ecommerceWithoutTimeField,
    logs,
    logsFrom,
    logsWhere,
  } = createEsqlConversionCaseContext();

  // Restricts the query to the top values of a dimension that `LIMIT n BY` cannot cap globally
  // (outer Top values, or Top values above a date histogram). Pass `where: null` to omit the
  // time filter (data views without a time field).
  const outerTopNSubquery = ({
    field,
    score,
    sort,
    size,
    from = logsFrom,
    where: whereOption,
  }: {
    field: string;
    score: string;
    sort: string;
    size: number;
    from?: string;
    where?: string | null;
  }) => {
    const where = whereOption === null ? undefined : whereOption ?? logsWhere;
    return [
      from,
      ...(where ? [where] : []),
      `WHERE ${field} IS NOT NULL`,
      `STATS ${score} BY ${field}`,
      `SORT ${sort}`,
      `LIMIT ${size}`,
      `KEEP ${field}`,
    ].join(' | ');
  };

  const outerTopNFilter = (args: Parameters<typeof outerTopNSubquery>[0]) =>
    `WHERE ${args.field} IN (${outerTopNSubquery(args)})`;

  // Top values + Other groups by a typed key that is null for non-top-N values, sorts "Other"
  // last through a named flag, then restores the field as keyword labels. Type casts use
  // uppercase to match `esql(...).print('basic')`.
  const otherBucketAliases = (field: string) => {
    const suffix = field.replace(/[^A-Za-z0-9_]/g, '_');
    return { key: `key_${suffix}`, named: `named_${suffix}` };
  };

  const otherBucketRemap = (args: Parameters<typeof outerTopNSubquery>[0]) => {
    const { field } = args;
    const { key } = otherBucketAliases(field);
    return `WHERE ${field} IS NOT NULL | EVAL ${key} = CASE(${field} IN (${outerTopNSubquery(
      args
    )}), ${field}, NULL)`;
  };

  // `sort` is the chart sort after the named flag; `drop` lists rank columns.
  const otherBucketTail = ({
    field,
    sort,
    limit,
    drop = [],
  }: {
    field: string;
    sort: string;
    limit?: number;
    drop?: string[];
  }) => {
    const { key, named } = otherBucketAliases(field);
    return [
      `EVAL ${named} = CASE(${key} IS NULL, 0::LONG, 1::LONG)`,
      `SORT ${named} DESC, ${sort}`,
      ...(limit === undefined ? [] : [`LIMIT ${limit}`]),
      `EVAL ${field} = COALESCE(TO_STRING(${key}), "Other"::KEYWORD)`,
      `DROP ${[named, key, ...drop].join(', ')}`,
    ].join(' | ');
  };

  // Single Top values + Other keeps size + 1 rows.
  const otherBucketQuery = ({
    stats,
    rankSort,
    ...args
  }: Parameters<typeof outerTopNSubquery>[0] & { stats: string; rankSort: string }) => {
    const { field, size } = args;
    return [
      otherBucketRemap(args),
      `STATS ${stats} BY ${otherBucketAliases(field).key}`,
      otherBucketTail({ field, sort: rankSort, limit: size + 1 }),
    ].join(' | ');
  };

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
      dataset: ecommerce,
      description:
        'top values ordered by a dotted-field metric — SORT doubles backticks inside the quoted expression name',
      columns: {
        col1: terms('category.keyword', {
          size: 9,
          orderBy: { type: 'column', columnId: 'col2' },
          orderDirection: 'desc',
        }),
        col2: metric('median', 'products.base_price'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        // STATS quotes the dotted field; SORT quotes the whole MEDIAN(...) output name as one
        // identifier, so inner backticks are escaped by doubling (``).
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS MEDIAN(\`products.base_price\`) BY category.keyword | SORT \`MEDIAN(\`\`products.base_price\`\`)\` DESC | LIMIT 9`,
        columnNames: ['MEDIAN(`products.base_price`)', 'category.keyword'],
        expectedSourceIds: {
          'MEDIAN(`products.base_price`)': ['col2'],
          'category.keyword': ['col1'],
        },
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
      expected: {
        success: false,
        reason: 'terms_rank_metric_not_supported',
      },
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
      expected: {
        success: false,
        reason: 'terms_order_by_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'single terms with other bucket ordered alphabetically',
      columns: {
        col1: terms('host.keyword', { size: 3, otherBucket: true }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketQuery({
          field: 'host.keyword',
          score: 'COUNT(*)',
          sort: 'host.keyword ASC',
          size: 3,
          stats: 'AVG(bytes)',
          rankSort: 'key_host_keyword ASC',
        })}`,
        columnNames: ['AVG(bytes)', 'host.keyword'],
        expectedSourceIds: { 'AVG(bytes)': ['col2'], 'host.keyword': ['col1'] },
        // The dataset has 4 hosts, so size 3 yields an Other row; "Other" sorts before the
        // lowercase hosts in plain ASC order, so this fails without the named flag.
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'single terms with other bucket ordered alphabetically DESC keeps Other last',
      columns: {
        col1: terms('host.keyword', { size: 3, otherBucket: true, orderDirection: 'desc' }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketQuery({
          field: 'host.keyword',
          score: 'COUNT(*)',
          sort: 'host.keyword DESC',
          size: 3,
          stats: 'AVG(bytes)',
          rankSort: 'key_host_keyword DESC',
        })}`,
        columnNames: ['AVG(bytes)', 'host.keyword'],
        expectedSourceIds: { 'AVG(bytes)': ['col2'], 'host.keyword': ['col1'] },
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'single terms with other bucket ranked by metric DESC',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col2' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketQuery({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword DESC, host.keyword ASC',
          size: 3,
          stats: 'AVG(bytes)',
          rankSort: '`AVG(bytes)` DESC, key_host_keyword ASC',
        })}`,
        columnNames: ['AVG(bytes)', 'host.keyword'],
        expectedSourceIds: { 'AVG(bytes)': ['col2'], 'host.keyword': ['col1'] },
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'single terms with other bucket ranked by metric ASC',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col2' },
          orderDirection: 'asc',
          otherBucket: true,
        }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketQuery({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword ASC, host.keyword ASC',
          size: 3,
          stats: 'AVG(bytes)',
          rankSort: '`AVG(bytes)` ASC, key_host_keyword ASC',
        })}`,
        columnNames: ['AVG(bytes)', 'host.keyword'],
        expectedSourceIds: { 'AVG(bytes)': ['col2'], 'host.keyword': ['col1'] },
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'single terms on an ip field with other bucket groups by the typed ip key',
      columns: {
        col1: terms(
          'clientip',
          {
            size: 9,
            orderBy: { type: 'column', columnId: 'col2' },
            orderDirection: 'desc',
            otherBucket: true,
          },
          { dataType: 'ip' }
        ),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketQuery({
          field: 'clientip',
          score: 'rank_clientip = AVG(bytes)',
          sort: 'rank_clientip DESC, clientip ASC',
          size: 9,
          stats: 'AVG(bytes)',
          rankSort: '`AVG(bytes)` DESC, key_clientip ASC',
        })}`,
        columnNames: ['AVG(bytes)', 'clientip'],
        expectedSourceIds: { 'AVG(bytes)': ['col2'], clientip: ['col1'] },
        expectedLastRow: { clientip: 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'single terms with other bucket and missing values is not convertible',
      columns: {
        col1: terms('host.keyword', { otherBucket: true, missingBucket: true }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: false,
        reason: 'terms_other_bucket_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'other bucket helper columns do not shadow a field that a metric reads',
      // The sample data has no field named like a helper column.
      skipApiExecution: true,
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col2' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: metric('sum', 'key_host_keyword'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | WHERE host.keyword IS NOT NULL | EVAL key_host_keyword_1 = CASE(host.keyword IN (${outerTopNSubquery(
          {
            field: 'host.keyword',
            score: 'rank_host_keyword = SUM(key_host_keyword)',
            sort: 'rank_host_keyword DESC, host.keyword ASC',
            size: 3,
          }
        )}), host.keyword, NULL) | STATS SUM(key_host_keyword) BY key_host_keyword_1 | EVAL named_host_keyword = CASE(key_host_keyword_1 IS NULL, 0::LONG, 1::LONG) | SORT named_host_keyword DESC, \`SUM(key_host_keyword)\` DESC, key_host_keyword_1 ASC | LIMIT 4 | EVAL host.keyword = COALESCE(TO_STRING(key_host_keyword_1), "Other"::KEYWORD) | DROP named_host_keyword, key_host_keyword_1`,
        columnNames: ['SUM(key_host_keyword)', 'host.keyword'],
        expectedSourceIds: { 'SUM(key_host_keyword)': ['col2'], 'host.keyword': ['col1'] },
      },
    },
    // Other converts only on the first bucket. Below another bucket, DSL builds one Other per
    // parent bucket, which the typed key does not express. A date histogram between an outer Top
    // values with Other and the inner one is not supported either, nor an inner Top values on the
    // same field, since both would share one output column.
    {
      group: 'top_n',
      dataset: logs,
      description: 'nested terms with other bucket on the inner dimension is not convertible',
      columns: {
        col1: terms('geo.src', {
          size: 2,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: false,
        reason: 'terms_other_bucket_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'nested terms with other bucket on both dimensions is not convertible',
      columns: {
        col1: terms('geo.src', {
          size: 2,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: false,
        reason: 'terms_other_bucket_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'date histogram above terms with other bucket is not convertible',
      columns: {
        col1: dateHistogram('timestamp', { interval: '1d' }),
        col2: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: false,
        reason: 'terms_other_bucket_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket above a date histogram above terms is not convertible',
      columns: {
        col1: terms('machine.os.keyword', {
          size: 2,
          orderBy: { type: 'column', columnId: 'col4' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col4' },
          orderDirection: 'desc',
        }),
        col4: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3', 'col4'],
      expected: {
        success: false,
        reason: 'terms_other_bucket_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket above terms on the same field is not convertible',
      columns: {
        col1: terms('machine.os.keyword', {
          size: 2,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: terms('machine.os.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: false,
        reason: 'terms_other_bucket_same_field_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description:
        'nested terms with other bucket and missing values on the outer dimension is not convertible',
      columns: {
        col1: terms('geo.src', {
          size: 2,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
          missingBucket: true,
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
        success: false,
        reason: 'terms_other_bucket_not_supported',
      },
    },
    // Top values above a date histogram: rank the top N globally, then plot those series over
    // time (`IN (subquery)` + optional INLINE STATS rank; no LIMIT n / LIMIT n BY).
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms above a date histogram (fixed interval) ranked by metric DESC',
      columns: {
        col1: terms('host.keyword', {
          size: 5,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword DESC',
          size: 5,
        })} | INLINE STATS rank_host_keyword = AVG(bytes) BY host.keyword | STATS AVG(bytes) BY rank_host_keyword, host.keyword, BUCKET(timestamp, 1 day) | SORT rank_host_keyword DESC, \`BUCKET(timestamp, 1 day)\` ASC | DROP rank_host_keyword`,
        columnNames: ['AVG(bytes)', 'host.keyword', 'BUCKET(timestamp, 1 day)'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'host.keyword': ['col1'],
          'BUCKET(timestamp, 1 day)': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms above a date histogram (fixed interval) ranked by metric ASC',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'asc',
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword ASC',
          size: 3,
        })} | INLINE STATS rank_host_keyword = AVG(bytes) BY host.keyword | STATS AVG(bytes) BY rank_host_keyword, host.keyword, BUCKET(timestamp, 1 day) | SORT rank_host_keyword ASC, \`BUCKET(timestamp, 1 day)\` ASC | DROP rank_host_keyword`,
        columnNames: ['AVG(bytes)', 'host.keyword', 'BUCKET(timestamp, 1 day)'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'host.keyword': ['col1'],
          'BUCKET(timestamp, 1 day)': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms above a date histogram (auto interval) ranked by metric',
      columns: {
        col1: terms('host.keyword', {
          size: 4,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: dateHistogram('timestamp', { interval: 'auto' }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword DESC',
          size: 4,
        })} | INLINE STATS rank_host_keyword = AVG(bytes) BY host.keyword | STATS AVG(bytes) BY rank_host_keyword, host.keyword, timestamp = BUCKET(timestamp, 75, ?_tstart, ?_tend) | SORT rank_host_keyword DESC, timestamp ASC | DROP rank_host_keyword`,
        columnNames: ['AVG(bytes)', 'host.keyword', 'timestamp'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'host.keyword': ['col1'],
          timestamp: ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms above a date histogram ranked alphabetically DESC',
      columns: {
        col1: terms('host.keyword', {
          size: 5,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'desc',
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'host.keyword',
          score: 'COUNT(*)',
          sort: 'host.keyword DESC',
          size: 5,
        })} | STATS COUNT(*) BY host.keyword, BUCKET(timestamp, 1 day) | SORT host.keyword DESC, \`BUCKET(timestamp, 1 day)\` ASC`,
        columnNames: ['COUNT(*)', 'host.keyword', 'BUCKET(timestamp, 1 day)'],
        expectedSourceIds: {
          'COUNT(*)': ['col3'],
          'host.keyword': ['col1'],
          'BUCKET(timestamp, 1 day)': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms above a date histogram ranked alphabetically ASC',
      columns: {
        col1: terms('host.keyword', {
          size: 4,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'host.keyword',
          score: 'COUNT(*)',
          sort: 'host.keyword ASC',
          size: 4,
        })} | STATS COUNT(*) BY host.keyword, BUCKET(timestamp, 1 day) | SORT host.keyword ASC, \`BUCKET(timestamp, 1 day)\` ASC`,
        columnNames: ['COUNT(*)', 'host.keyword', 'BUCKET(timestamp, 1 day)'],
        expectedSourceIds: {
          'COUNT(*)': ['col3'],
          'host.keyword': ['col1'],
          'BUCKET(timestamp, 1 day)': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms above a date histogram uses the metric column role in STATS only',
      columns: {
        col1: terms('host.keyword', {
          size: 5,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      columnRoles: { col3: 'avg_bytes' },
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword DESC',
          size: 5,
        })} | INLINE STATS rank_host_keyword = AVG(bytes) BY host.keyword | STATS avg_bytes = AVG(bytes) BY rank_host_keyword, host.keyword, BUCKET(timestamp, 1 day) | SORT rank_host_keyword DESC, \`BUCKET(timestamp, 1 day)\` ASC | DROP rank_host_keyword`,
        columnNames: ['avg_bytes', 'host.keyword', 'BUCKET(timestamp, 1 day)'],
        expectedSourceIds: {
          avg_bytes: ['col3'],
          'host.keyword': ['col1'],
          'BUCKET(timestamp, 1 day)': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms above a date histogram ranked by a KQL-filtered metric',
      columns: {
        col1: terms('host.keyword', {
          size: 5,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: count({ filter: { language: 'kuery', query: 'bytes > 1000' } }),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'host.keyword',
          score: 'rank_host_keyword = COUNT(*) WHERE KQL("bytes > 1000")',
          sort: 'rank_host_keyword DESC',
          size: 5,
        })} | INLINE STATS rank_host_keyword = COUNT(*) WHERE KQL("bytes > 1000") BY host.keyword | STATS COUNT(*) WHERE KQL("bytes > 1000") BY rank_host_keyword, host.keyword, BUCKET(timestamp, 1 day) | SORT rank_host_keyword DESC, \`BUCKET(timestamp, 1 day)\` ASC | DROP rank_host_keyword`,
        columnNames: [
          'COUNT(*) WHERE KQL("bytes > 1000")',
          'host.keyword',
          'BUCKET(timestamp, 1 day)',
        ],
        expectedSourceIds: {
          'COUNT(*) WHERE KQL("bytes > 1000")': ['col3'],
          'host.keyword': ['col1'],
          'BUCKET(timestamp, 1 day)': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: ecommerceWithoutTimeField,
      description: 'terms above a date histogram without a time field omits WHERE in the subquery',
      skipApiExecution: true,
      columns: {
        col1: terms('category.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: dateHistogram('order_date', { interval: '1d' }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${outerTopNFilter({
          field: 'category.keyword',
          score: 'rank_category_keyword = COUNT(*)',
          sort: 'rank_category_keyword DESC',
          size: 3,
          from: ecommerceFrom,
          where: null,
        })} | INLINE STATS rank_category_keyword = COUNT(*) BY category.keyword | STATS COUNT(*) BY rank_category_keyword, category.keyword, BUCKET(order_date, 1 day) | SORT rank_category_keyword DESC, \`BUCKET(order_date, 1 day)\` ASC | DROP rank_category_keyword`,
        columnNames: ['COUNT(*)', 'category.keyword', 'BUCKET(order_date, 1 day)'],
        expectedSourceIds: {
          'COUNT(*)': ['col3'],
          'category.keyword': ['col1'],
          'BUCKET(order_date, 1 day)': ['col2'],
        },
      },
    },
    // Top values + Other above a date histogram reuses the typed key. The rank is grouped by the
    // key so every remaining value shares one rank and Other stays a single series. The dataset
    // has 4 hosts, so size 3 yields an Other series; the label column comes last.
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket above a date histogram ranked by metric DESC',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword DESC, host.keyword ASC',
          size: 3,
        })} | INLINE STATS rank_host_keyword = AVG(bytes) BY key_host_keyword | STATS AVG(bytes) BY rank_host_keyword, key_host_keyword, BUCKET(timestamp, 1 day) | ${otherBucketTail(
          {
            field: 'host.keyword',
            sort: 'rank_host_keyword DESC, key_host_keyword ASC, `BUCKET(timestamp, 1 day)` ASC',
            drop: ['rank_host_keyword'],
          }
        )}`,
        columnNames: ['AVG(bytes)', 'BUCKET(timestamp, 1 day)', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'BUCKET(timestamp, 1 day)': ['col2'],
          'host.keyword': ['col1'],
        },
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket above a date histogram ranked by metric ASC',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'asc',
          otherBucket: true,
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword ASC, host.keyword ASC',
          size: 3,
        })} | INLINE STATS rank_host_keyword = AVG(bytes) BY key_host_keyword | STATS AVG(bytes) BY rank_host_keyword, key_host_keyword, BUCKET(timestamp, 1 day) | ${otherBucketTail(
          {
            field: 'host.keyword',
            sort: 'rank_host_keyword ASC, key_host_keyword ASC, `BUCKET(timestamp, 1 day)` ASC',
            drop: ['rank_host_keyword'],
          }
        )}`,
        columnNames: ['AVG(bytes)', 'BUCKET(timestamp, 1 day)', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'BUCKET(timestamp, 1 day)': ['col2'],
          'host.keyword': ['col1'],
        },
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket above a date histogram ranked by count',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'host.keyword',
          score: 'rank_host_keyword = COUNT(*)',
          sort: 'rank_host_keyword DESC, host.keyword ASC',
          size: 3,
        })} | INLINE STATS rank_host_keyword = COUNT(*) BY key_host_keyword | STATS COUNT(*) BY rank_host_keyword, key_host_keyword, BUCKET(timestamp, 1 day) | ${otherBucketTail(
          {
            field: 'host.keyword',
            sort: 'rank_host_keyword DESC, key_host_keyword ASC, `BUCKET(timestamp, 1 day)` ASC',
            drop: ['rank_host_keyword'],
          }
        )}`,
        columnNames: ['COUNT(*)', 'BUCKET(timestamp, 1 day)', 'host.keyword'],
        expectedSourceIds: {
          'COUNT(*)': ['col3'],
          'BUCKET(timestamp, 1 day)': ['col2'],
          'host.keyword': ['col1'],
        },
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket above a date histogram ranked alphabetically',
      columns: {
        col1: terms('host.keyword', { size: 3, otherBucket: true }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'host.keyword',
          score: 'COUNT(*)',
          sort: 'host.keyword ASC',
          size: 3,
        })} | STATS COUNT(*) BY key_host_keyword, BUCKET(timestamp, 1 day) | ${otherBucketTail({
          field: 'host.keyword',
          sort: 'key_host_keyword ASC, `BUCKET(timestamp, 1 day)` ASC',
        })}`,
        columnNames: ['COUNT(*)', 'BUCKET(timestamp, 1 day)', 'host.keyword'],
        expectedSourceIds: {
          'COUNT(*)': ['col3'],
          'BUCKET(timestamp, 1 day)': ['col2'],
          'host.keyword': ['col1'],
        },
        // "Other" sorts before the lowercase hosts in plain ASC order.
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket above a date histogram (auto interval)',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: dateHistogram('timestamp', { interval: 'auto' }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'host.keyword',
          score: 'rank_host_keyword = AVG(bytes)',
          sort: 'rank_host_keyword DESC, host.keyword ASC',
          size: 3,
        })} | INLINE STATS rank_host_keyword = AVG(bytes) BY key_host_keyword | STATS AVG(bytes) BY rank_host_keyword, key_host_keyword, timestamp = BUCKET(timestamp, 75, ?_tstart, ?_tend) | ${otherBucketTail(
          {
            field: 'host.keyword',
            sort: 'rank_host_keyword DESC, key_host_keyword ASC, timestamp ASC',
            drop: ['rank_host_keyword'],
          }
        )}`,
        columnNames: ['AVG(bytes)', 'timestamp', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          timestamp: ['col2'],
          'host.keyword': ['col1'],
        },
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'terms with other bucket above a date histogram ranked by a KQL-filtered metric',
      columns: {
        col1: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: count({ filter: { language: 'kuery', query: 'bytes > 1000' } }),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'host.keyword',
          score: 'rank_host_keyword = COUNT(*) WHERE KQL("bytes > 1000")',
          sort: 'rank_host_keyword DESC, host.keyword ASC',
          size: 3,
        })} | INLINE STATS rank_host_keyword = COUNT(*) WHERE KQL("bytes > 1000") BY key_host_keyword | STATS COUNT(*) WHERE KQL("bytes > 1000") BY rank_host_keyword, key_host_keyword, BUCKET(timestamp, 1 day) | ${otherBucketTail(
          {
            field: 'host.keyword',
            sort: 'rank_host_keyword DESC, key_host_keyword ASC, `BUCKET(timestamp, 1 day)` ASC',
            drop: ['rank_host_keyword'],
          }
        )}`,
        columnNames: [
          'COUNT(*) WHERE KQL("bytes > 1000")',
          'BUCKET(timestamp, 1 day)',
          'host.keyword',
        ],
        expectedSourceIds: {
          'COUNT(*) WHERE KQL("bytes > 1000")': ['col3'],
          'BUCKET(timestamp, 1 day)': ['col2'],
          'host.keyword': ['col1'],
        },
        expectedLastRow: { 'host.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: ecommerceWithoutTimeField,
      description:
        'terms with other bucket above a date histogram without a time field omits WHERE in the subquery',
      skipApiExecution: true,
      columns: {
        col1: terms('category.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
        }),
        col2: dateHistogram('order_date', { interval: '1d' }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${ecommerceFrom} | ${otherBucketRemap({
          field: 'category.keyword',
          score: 'rank_category_keyword = COUNT(*)',
          sort: 'rank_category_keyword DESC, category.keyword ASC',
          size: 3,
          from: ecommerceFrom,
          where: null,
        })} | INLINE STATS rank_category_keyword = COUNT(*) BY key_category_keyword | STATS COUNT(*) BY rank_category_keyword, key_category_keyword, BUCKET(order_date, 1 day) | ${otherBucketTail(
          {
            field: 'category.keyword',
            sort: 'rank_category_keyword DESC, key_category_keyword ASC, `BUCKET(order_date, 1 day)` ASC',
            drop: ['rank_category_keyword'],
          }
        )}`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 1 day)', 'category.keyword'],
        expectedSourceIds: {
          'COUNT(*)': ['col3'],
          'BUCKET(order_date, 1 day)': ['col2'],
          'category.keyword': ['col1'],
        },
      },
    },
    // A date histogram above Top values ranks the top N per time bucket, which is the
    // inner-terms `LIMIT n BY` path with the bucket as the group. The bucket output name is
    // an expression for fixed intervals, so LIMIT BY and SORT quote it as one identifier.
    {
      group: 'top_n',
      dataset: logs,
      description: 'date histogram (fixed interval) above terms ranked by metric',
      columns: {
        col1: dateHistogram('timestamp', { interval: '1d' }),
        col2: terms('host.keyword', {
          size: 5,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | STATS AVG(bytes) BY BUCKET(timestamp, 1 day), host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 5 BY \`BUCKET(timestamp, 1 day)\` | SORT \`BUCKET(timestamp, 1 day)\` ASC, \`AVG(bytes)\` DESC`,
        columnNames: ['AVG(bytes)', 'BUCKET(timestamp, 1 day)', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'BUCKET(timestamp, 1 day)': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'date histogram (auto interval) above terms ranked alphabetically',
      columns: {
        col1: dateHistogram('timestamp', { interval: 'auto' }),
        col2: terms('host.keyword', {
          size: 4,
          orderBy: { type: 'alphabetical' },
          orderDirection: 'desc',
        }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        // The auto-interval bucket is aliased to its source field, so it needs no quoting.
        esql: `${logsFrom} | ${logsWhere} | STATS COUNT(*) BY timestamp = BUCKET(timestamp, 75, ?_tstart, ?_tend), host.keyword | SORT host.keyword DESC | LIMIT 4 BY timestamp | SORT timestamp ASC, host.keyword DESC`,
        columnNames: ['COUNT(*)', 'timestamp', 'host.keyword'],
        expectedSourceIds: {
          'COUNT(*)': ['col3'],
          timestamp: ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description:
        'terms above a date histogram above terms keeps the top N per outer value and bucket',
      columns: {
        col1: terms('geo.src', {
          size: 5,
          orderBy: { type: 'column', columnId: 'col4' },
          orderDirection: 'desc',
        }),
        col2: dateHistogram('timestamp', { interval: '1d' }),
        col3: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col4' },
          orderDirection: 'desc',
        }),
        col4: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3', 'col4'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'geo.src',
          score: 'rank_geo_src = AVG(bytes)',
          sort: 'rank_geo_src DESC',
          size: 5,
        })} | INLINE STATS rank_geo_src = AVG(bytes) BY geo.src | STATS AVG(bytes) BY rank_geo_src, geo.src, BUCKET(timestamp, 1 day), host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3 BY geo.src, \`BUCKET(timestamp, 1 day)\` | SORT rank_geo_src DESC, \`BUCKET(timestamp, 1 day)\` ASC, \`AVG(bytes)\` DESC | DROP rank_geo_src`,
        columnNames: ['AVG(bytes)', 'geo.src', 'BUCKET(timestamp, 1 day)', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col4'],
          'geo.src': ['col1'],
          'BUCKET(timestamp, 1 day)': ['col2'],
          'host.keyword': ['col3'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'date histogram above two terms dimensions is not convertible',
      columns: {
        col1: dateHistogram('timestamp', { interval: '1d' }),
        col2: terms('geo.src', {}),
        col3: terms('host.keyword', {}),
        col4: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3', 'col4'],
      expected: {
        success: false,
        reason: 'terms_date_histogram_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'two terms dimensions above a date histogram is not convertible',
      columns: {
        col1: terms('geo.src', {}),
        col2: terms('host.keyword', {}),
        col3: dateHistogram('timestamp', { interval: '1d' }),
        col4: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3', 'col4'],
      expected: {
        success: false,
        reason: 'terms_date_histogram_not_supported',
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description:
        'single terms with accuracy mode and other bucket reports accuracy (Other is supported)',
      columns: {
        col1: terms('host.keyword', { accuracyMode: true, otherBucket: true }),
        col2: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2'],
      expected: {
        success: false,
        reason: 'terms_accuracy_mode_not_supported',
      },
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
      expected: {
        success: false,
        reason: 'terms_multi_level_not_supported',
      },
    },
    // Multi-terms parity has three parts: the outer dimension keeps only its top values,
    // `LIMIT n BY` keeps the inner top values per outer value, and a second SORT applies the
    // outer ordering that the leading SORT cannot express because `LIMIT BY` consumes it.
    // A metric-ranked outer dimension is ordered by its metric per outer value: INLINE STATS
    // computes it as a `rank_<field>` column for the second SORT, and DROP removes it after.
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
          score: 'rank_geo_src = AVG(bytes)',
          sort: 'rank_geo_src DESC',
          size: 5,
        })} | INLINE STATS rank_geo_src = AVG(bytes) BY geo.src | STATS AVG(bytes) BY rank_geo_src, geo.src, host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3 BY geo.src | SORT rank_geo_src DESC, \`AVG(bytes)\` DESC | DROP rank_geo_src`,
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
      description: 'two terms both ranked by count DESC',
      columns: {
        col1: terms('agent.keyword', {
          size: 9,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: terms('host.keyword', {
          size: 9,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col3: count(),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'agent.keyword',
          score: 'rank_agent_keyword = COUNT(*)',
          sort: 'rank_agent_keyword DESC',
          size: 9,
        })} | INLINE STATS rank_agent_keyword = COUNT(*) BY agent.keyword | STATS COUNT(*) BY rank_agent_keyword, agent.keyword, host.keyword | SORT \`COUNT(*)\` DESC | LIMIT 9 BY agent.keyword | SORT rank_agent_keyword DESC, \`COUNT(*)\` DESC | DROP rank_agent_keyword`,
        columnNames: ['COUNT(*)', 'agent.keyword', 'host.keyword'],
        expectedSourceIds: {
          'COUNT(*)': ['col3'],
          'agent.keyword': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'two terms on the same field share one column',
      columns: {
        col1: terms('machine.os.keyword', {
          size: 2,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col2: terms('machine.os.keyword', {
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
          field: 'machine.os.keyword',
          score: 'rank_machine_os_keyword = AVG(bytes)',
          sort: 'rank_machine_os_keyword DESC',
          size: 2,
        })} | INLINE STATS rank_machine_os_keyword = AVG(bytes) BY machine.os.keyword | STATS AVG(bytes) BY rank_machine_os_keyword, machine.os.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3 BY machine.os.keyword | SORT rank_machine_os_keyword DESC, \`AVG(bytes)\` DESC | DROP rank_machine_os_keyword`,
        columnNames: ['AVG(bytes)', 'machine.os.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'machine.os.keyword': ['col1', 'col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'outer ranked by a different metric than the inner dimension',
      columns: {
        col1: terms('geo.src', {
          size: 5,
          orderBy: { type: 'column', columnId: 'col4' },
          orderDirection: 'desc',
        }),
        col2: terms('host.keyword', {
          size: 3,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
        }),
        col3: metric('average', 'bytes'),
        col4: count(),
      },
      columnOrder: ['col1', 'col2', 'col3', 'col4'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'geo.src',
          score: 'rank_geo_src = COUNT(*)',
          sort: 'rank_geo_src DESC',
          size: 5,
        })} | INLINE STATS rank_geo_src = COUNT(*) BY geo.src | STATS AVG(bytes), COUNT(*) BY rank_geo_src, geo.src, host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3 BY geo.src | SORT rank_geo_src DESC, \`AVG(bytes)\` DESC | DROP rank_geo_src`,
        columnNames: ['AVG(bytes)', 'COUNT(*)', 'geo.src', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'COUNT(*)': ['col4'],
          'geo.src': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'outer ranked by a KQL-filtered metric keeps the filter in the rank',
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
        col3: count({ filter: { language: 'kuery', query: 'bytes > 1000' } }),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'geo.src',
          score: 'rank_geo_src = COUNT(*) WHERE KQL("bytes > 1000")',
          sort: 'rank_geo_src DESC',
          size: 5,
        })} | INLINE STATS rank_geo_src = COUNT(*) WHERE KQL("bytes > 1000") BY geo.src | STATS COUNT(*) WHERE KQL("bytes > 1000") BY rank_geo_src, geo.src, host.keyword | SORT \`COUNT(*) WHERE KQL("bytes > 1000")\` DESC | LIMIT 3 BY geo.src | SORT rank_geo_src DESC, \`COUNT(*) WHERE KQL("bytes > 1000")\` DESC | DROP rank_geo_src`,
        columnNames: ['COUNT(*) WHERE KQL("bytes > 1000")', 'geo.src', 'host.keyword'],
        expectedSourceIds: {
          'COUNT(*) WHERE KQL("bytes > 1000")': ['col3'],
          'geo.src': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'outer rank uses its own alias when the metric has a column role',
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
      columnRoles: { col3: 'avg_bytes' },
      expected: {
        success: true,
        esql: `${logsFrom} | ${logsWhere} | ${outerTopNFilter({
          field: 'geo.src',
          score: 'rank_geo_src = AVG(bytes)',
          sort: 'rank_geo_src DESC',
          size: 5,
        })} | INLINE STATS rank_geo_src = AVG(bytes) BY geo.src | STATS avg_bytes = AVG(bytes) BY rank_geo_src, geo.src, host.keyword | SORT avg_bytes DESC | LIMIT 3 BY geo.src | SORT rank_geo_src DESC, avg_bytes DESC | DROP rank_geo_src`,
        columnNames: ['avg_bytes', 'geo.src', 'host.keyword'],
        expectedSourceIds: {
          avg_bytes: ['col3'],
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
      description: 'both dimensions ranked by the same metric in opposite directions',
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
          score: 'rank_geo_src = AVG(bytes)',
          sort: 'rank_geo_src ASC',
          size: 5,
        })} | INLINE STATS rank_geo_src = AVG(bytes) BY geo.src | STATS AVG(bytes) BY rank_geo_src, geo.src, host.keyword | SORT \`AVG(bytes)\` DESC | LIMIT 3 BY geo.src | SORT rank_geo_src ASC, \`AVG(bytes)\` DESC | DROP rank_geo_src`,
        columnNames: ['AVG(bytes)', 'geo.src', 'host.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'geo.src': ['col1'],
          'host.keyword': ['col2'],
        },
      },
    },
    // Other on the outer dimension: the outer rank is grouped by the key before documents
    // without the inner field are dropped, as DSL ranks an outer value over all of its
    // documents. `LIMIT n BY` on the key keeps the inner top values inside Other too, and the
    // inner ranking breaks ties by the inner field.
    {
      group: 'top_n',
      dataset: logs,
      description: 'nested terms with other bucket on the outer dimension ranked by metric DESC',
      columns: {
        col1: terms('machine.os.keyword', {
          size: 2,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'desc',
          otherBucket: true,
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
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'machine.os.keyword',
          score: 'rank_machine_os_keyword = AVG(bytes)',
          sort: 'rank_machine_os_keyword DESC, machine.os.keyword ASC',
          size: 2,
        })} | INLINE STATS rank_machine_os_keyword = AVG(bytes) BY key_machine_os_keyword | WHERE host.keyword IS NOT NULL | STATS AVG(bytes) BY rank_machine_os_keyword, key_machine_os_keyword, host.keyword | SORT \`AVG(bytes)\` DESC, host.keyword ASC | LIMIT 3 BY key_machine_os_keyword | ${otherBucketTail(
          {
            field: 'machine.os.keyword',
            sort: 'rank_machine_os_keyword DESC, key_machine_os_keyword ASC, `AVG(bytes)` DESC, host.keyword ASC',
            drop: ['rank_machine_os_keyword'],
          }
        )}`,
        columnNames: ['AVG(bytes)', 'host.keyword', 'machine.os.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'machine.os.keyword': ['col1'],
          'host.keyword': ['col2'],
        },
        expectedLastRow: { 'machine.os.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'nested terms with other bucket on the outer dimension ranked by metric ASC',
      columns: {
        col1: terms('machine.os.keyword', {
          size: 2,
          orderBy: { type: 'column', columnId: 'col3' },
          orderDirection: 'asc',
          otherBucket: true,
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
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'machine.os.keyword',
          score: 'rank_machine_os_keyword = AVG(bytes)',
          sort: 'rank_machine_os_keyword ASC, machine.os.keyword ASC',
          size: 2,
        })} | INLINE STATS rank_machine_os_keyword = AVG(bytes) BY key_machine_os_keyword | WHERE host.keyword IS NOT NULL | STATS AVG(bytes) BY rank_machine_os_keyword, key_machine_os_keyword, host.keyword | SORT \`AVG(bytes)\` DESC, host.keyword ASC | LIMIT 3 BY key_machine_os_keyword | ${otherBucketTail(
          {
            field: 'machine.os.keyword',
            sort: 'rank_machine_os_keyword ASC, key_machine_os_keyword ASC, `AVG(bytes)` DESC, host.keyword ASC',
            drop: ['rank_machine_os_keyword'],
          }
        )}`,
        columnNames: ['AVG(bytes)', 'host.keyword', 'machine.os.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'machine.os.keyword': ['col1'],
          'host.keyword': ['col2'],
        },
        expectedLastRow: { 'machine.os.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'nested terms with other bucket on the outer dimension ranked alphabetically',
      columns: {
        col1: terms('machine.os.keyword', { size: 2, otherBucket: true }),
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
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'machine.os.keyword',
          score: 'COUNT(*)',
          sort: 'machine.os.keyword ASC',
          size: 2,
        })} | WHERE host.keyword IS NOT NULL | STATS AVG(bytes) BY key_machine_os_keyword, host.keyword | SORT \`AVG(bytes)\` DESC, host.keyword ASC | LIMIT 3 BY key_machine_os_keyword | ${otherBucketTail(
          {
            field: 'machine.os.keyword',
            sort: 'key_machine_os_keyword ASC, `AVG(bytes)` DESC, host.keyword ASC',
          }
        )}`,
        columnNames: ['AVG(bytes)', 'host.keyword', 'machine.os.keyword'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          'machine.os.keyword': ['col1'],
          'host.keyword': ['col2'],
        },
        expectedLastRow: { 'machine.os.keyword': 'Other' },
      },
    },
    {
      group: 'top_n',
      dataset: logs,
      description: 'nested terms with other bucket on an outer ip field groups by the typed ip key',
      columns: {
        col1: terms(
          'clientip',
          {
            size: 3,
            orderBy: { type: 'column', columnId: 'col3' },
            orderDirection: 'desc',
            otherBucket: true,
          },
          { dataType: 'ip' }
        ),
        col2: terms('host.keyword', { size: 2 }),
        col3: metric('average', 'bytes'),
      },
      columnOrder: ['col1', 'col2', 'col3'],
      expected: {
        success: true,
        // The inner field is already the alphabetical sort key, so it is not repeated as the
        // tie-breaker.
        esql: `${logsFrom} | ${logsWhere} | ${otherBucketRemap({
          field: 'clientip',
          score: 'rank_clientip = AVG(bytes)',
          sort: 'rank_clientip DESC, clientip ASC',
          size: 3,
        })} | INLINE STATS rank_clientip = AVG(bytes) BY key_clientip | WHERE host.keyword IS NOT NULL | STATS AVG(bytes) BY rank_clientip, key_clientip, host.keyword | SORT host.keyword ASC | LIMIT 2 BY key_clientip | ${otherBucketTail(
          {
            field: 'clientip',
            sort: 'rank_clientip DESC, key_clientip ASC, host.keyword ASC',
            drop: ['rank_clientip'],
          }
        )}`,
        columnNames: ['AVG(bytes)', 'host.keyword', 'clientip'],
        expectedSourceIds: {
          'AVG(bytes)': ['col3'],
          clientip: ['col1'],
          'host.keyword': ['col2'],
        },
        expectedLastRow: { clientip: 'Other' },
      },
    },
  ];
};
