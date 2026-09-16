/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared form-based (DSL) → ES|QL conversion case matrix for Lens.
 *
 * Single source of truth consumed by two layers:
 * - unit tests (@kbn/lens-common): assert the exact generated ES|QL string
 *   (and failure reasons) for every case — fast, no infra required
 * - Scout API tests (Lens plugin): execute the generated queries against a
 *   real Elasticsearch to catch regressions in query validity, result schema
 *   and ES-side semantics
 *
 * Cases are ports of the legacy `generate_esql_query[.<group>].test.ts` unit
 * tests and keep their original index/field shapes, mapped onto the Kibana
 * sample data sets so every success case is executable:
 * - `ecommerce` (`kibana_sample_data_ecommerce`, time field `order_date`) for
 *   the core / date_histogram / static_value groups
 * - `logs` (`kibana_sample_data_logs`, time field `timestamp`) for the top_n
 *   group (`AVG(bytes) BY host.keyword`, as in the legacy top_n tests)
 *
 * This package stays dependency-free: column configs and the index-pattern
 * stub are plain structural objects; consumers cast them to the Lens types
 * (`GenericIndexPatternColumn`, `FormBasedLayer`, `IndexPattern`).
 */

/** Sample data set a case binds to; Scout consumers install it via `apiServices.sampleData`. */
export type EsqlConversionDatasetId = 'ecommerce' | 'logs';

export interface EsqlConversionDataset {
  readonly id: EsqlConversionDatasetId;
  readonly index: string;
  /** Undefined models a data view without a time field (no WHERE clause is generated). */
  readonly timeField?: string;
  /** Field name → stub type used by the index-pattern stub. */
  readonly fieldTypes: Readonly<Record<string, string>>;
}

export const ESQL_CONVERSION_DATASETS: Record<EsqlConversionDatasetId, EsqlConversionDataset> = {
  ecommerce: {
    id: 'ecommerce',
    index: 'kibana_sample_data_ecommerce',
    timeField: 'order_date',
    fieldTypes: {
      order_date: 'date',
      taxful_total_price: 'number',
      total_quantity: 'number',
      'products.base_price': 'number',
      customer_id: 'string',
      'category.keyword': 'string',
    },
  },
  logs: {
    id: 'logs',
    index: 'kibana_sample_data_logs',
    timeField: 'timestamp',
    fieldTypes: {
      timestamp: 'date',
      bytes: 'number',
      'host.keyword': 'string',
      'machine.os.keyword': 'string',
    },
  },
};

/** Minimal structural shape of a form-based column config. */
export interface EsqlConversionColumn {
  readonly operationType: string;
  readonly label: string;
  readonly dataType: string;
  readonly isBucketed: boolean;
  readonly sourceField?: string;
  readonly timeShift?: string;
  readonly reducedTimeRange?: string;
  readonly filter?: { readonly language: string; readonly query: string };
  readonly customLabel?: boolean;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface EsqlConversionSuccess {
  readonly success: true;
  /** Exact generated ES|QL (post `print('basic')`); asserted by unit consumers. */
  readonly esql: string;
  /**
   * Result column names in table order (STATS metrics, BY buckets, EVAL
   * static values last); asserted against ES response columns by Scout
   * consumers and against esAggsIdMap keys by unit consumers.
   */
  readonly columnNames: readonly string[];
  /**
   * Optional per-output-column format expectations for the generated
   * esAggsIdMap; asserted by unit consumers only (no ES-side semantics).
   */
  readonly expectedFormats?: Readonly<Record<string, unknown>>;
  /**
   * Optional per-output-column label expectations for the generated
   * esAggsIdMap; asserted by unit consumers only.
   */
  readonly expectedLabels?: Readonly<Record<string, string>>;
  /**
   * EVAL-only queries preserve all source columns. Scout consumers still
   * require these generated columns, but do not require an exact schema.
   */
  readonly allowAdditionalColumns?: true;
}

export interface EsqlConversionFailure {
  readonly success: false;
  readonly reason: string;
}

/**
 * Case group; mirrors the legacy per-topic unit test files
 * (`generate_esql_query[.<group>].test.ts`). Consumers use it to build
 * `describe` blocks / test-title prefixes.
 */
export type EsqlConversionCaseGroup = 'core' | 'date_histogram' | 'top_n' | 'static_value';

export interface EsqlConversionCase {
  readonly group: EsqlConversionCaseGroup;
  readonly dataset: EsqlConversionDataset;
  readonly description: string;
  readonly columns: Readonly<Record<string, EsqlConversionColumn>>;
  readonly columnOrder: readonly string[];
  /** Optional columnId → semantic role name mapping (visualization-derived in the UI). */
  readonly columnRoles?: Readonly<Record<string, string>>;
  /**
   * When true, unit consumers call generateEsqlQuery without a date range
   * (models a detached time picker; auto date histograms fall back to 1h).
   */
  readonly omitDateRange?: true;
  readonly expected: EsqlConversionSuccess | EsqlConversionFailure;
}

/**
 * Pinned inputs shared by both consumers so the generated query strings are
 * identical in the unit and Scout API layers. Scout consumers install the
 * sample data sets with `now` pinned to `ESQL_CONVERSION_NOW` so the rebased
 * document timestamps fall inside this range.
 */
export const ESQL_CONVERSION_DATE_RANGE = {
  fromDate: '2023-04-16T00:00:00.000Z',
  toDate: '2023-06-16T00:00:00.000Z',
} as const;

export const ESQL_CONVERSION_NOW = new Date('2023-06-16T00:00:00.000Z');

/** Jest-free UiSettingsReader-compatible stub with Kibana defaults. */
export const createEsqlConversionUiSettings = () => ({
  get: <T = unknown>(key: string): T => {
    const settings: Record<string, unknown> = {
      dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
      'dateFormat:scaled': [[]],
      'dateFormat:tz': 'UTC',
      'histogram:barTarget': 50,
      'histogram:maxBars': 100,
    };
    return settings[key] as T;
  },
});

/**
 * IndexPattern-compatible structural stub for a case's dataset.
 * `___records___` intentionally resolves to no field so `count` converts to
 * `COUNT(*)`.
 */
export const createEsqlConversionIndexPattern = (dataset: EsqlConversionDataset) => ({
  id: dataset.index,
  title: dataset.index,
  timeFieldName: dataset.timeField,
  getFieldByName: (fieldName: string) => {
    const type = dataset.fieldTypes[fieldName];
    if (!type) return undefined;
    return { name: fieldName, displayName: fieldName, type };
  },
  getFormatterForField: () => ({ convertToText: (value: unknown) => String(value) }),
});

const count = (overrides: Partial<EsqlConversionColumn> = {}): EsqlConversionColumn => ({
  operationType: 'count',
  sourceField: '___records___',
  label: 'Count of records',
  dataType: 'number',
  isBucketed: false,
  ...overrides,
});

const metric = (
  operationType: 'average' | 'max' | 'median' | 'sum' | 'min',
  sourceField: string,
  overrides: Partial<EsqlConversionColumn> = {}
): EsqlConversionColumn => ({
  operationType,
  sourceField,
  label: `${operationType} of ${sourceField}`,
  dataType: 'number',
  isBucketed: false,
  ...overrides,
});

const terms = (
  sourceField: string,
  params: Record<string, unknown>,
  overrides: Partial<EsqlConversionColumn> = {}
): EsqlConversionColumn => ({
  operationType: 'terms',
  sourceField,
  label: `Top values of ${sourceField}`,
  dataType: 'string',
  isBucketed: true,
  params: {
    size: 5,
    orderBy: { type: 'alphabetical' },
    orderDirection: 'asc',
    otherBucket: false,
    ...params,
  },
  ...overrides,
});

const staticValue = (value: string): EsqlConversionColumn => ({
  operationType: 'static_value',
  label: `Static value: ${value}`,
  dataType: 'number',
  isBucketed: false,
  params: { value },
});

const dateHistogram = (
  sourceField: string,
  params: Record<string, unknown>
): EsqlConversionColumn => ({
  operationType: 'date_histogram',
  sourceField,
  label: sourceField,
  dataType: 'date',
  isBucketed: true,
  params,
});

export const buildEsqlConversionCases = (): EsqlConversionCase[] => {
  const ecommerce = ESQL_CONVERSION_DATASETS.ecommerce;
  const logs = ESQL_CONVERSION_DATASETS.logs;
  // Same physical index, but modeled as a data view without a time field:
  // generation must omit the WHERE clause. Scout consumers install by dataset
  // id, so this adds no extra install.
  const ecommerceWithoutTimeField: EsqlConversionDataset = {
    ...ecommerce,
    timeField: undefined,
  };

  const ecommerceFrom = `FROM ${ecommerce.index}`;
  const ecommerceWhere = `WHERE ${ecommerce.timeField} >= ?_tstart AND ${ecommerce.timeField} <= ?_tend`;
  const logsFrom = `FROM ${logs.index}`;
  const logsWhere = `WHERE ${logs.timeField} >= ?_tstart AND ${logs.timeField} <= ?_tend`;

  const coreCases: EsqlConversionCase[] = [
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
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) WHERE KQL("customer_gender:\\"MALE\\"") BY BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: [
          'COUNT(*) WHERE KQL("customer_gender:\\"MALE\\"")',
          'BUCKET(order_date, 75, ?_tstart, ?_tend)',
        ],
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
        esql: `${ecommerceFrom} | STATS COUNT(*) BY BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 75, ?_tstart, ?_tend)'],
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
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS SUM(taxful_total_price) BY BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['SUM(taxful_total_price)', 'BUCKET(order_date, 75, ?_tstart, ?_tend)'],
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
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS AVG(taxful_total_price) BY BUCKET(order_date, 75, ?_tstart, ?_tend)`,
        columnNames: ['AVG(taxful_total_price)', 'BUCKET(order_date, 75, ?_tstart, ?_tend)'],
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

  const dateHistogramCases: EsqlConversionCase[] = [
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

  const topNCases: EsqlConversionCase[] = [
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
  ];

  const staticValueCases: EsqlConversionCase[] = [
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
        esql: `${ecommerceFrom} | ${ecommerceWhere} | STATS COUNT(*) BY BUCKET(order_date, 75, ?_tstart, ?_tend) | EVAL static_value = 100`,
        columnNames: ['COUNT(*)', 'BUCKET(order_date, 75, ?_tstart, ?_tend)', 'static_value'],
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
        expectedLabels: { max_value: 'Maximum of taxful_total_price' },
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
      },
    },
  ];

  return [...coreCases, ...dateHistogramCases, ...topNCases, ...staticValueCases];
};

/** Cases grouped for `describe`-style nesting, keyed by group name. */
export const buildEsqlConversionCasesByGroup = (): Record<
  EsqlConversionCaseGroup,
  EsqlConversionCase[]
> => {
  const grouped: Record<EsqlConversionCaseGroup, EsqlConversionCase[]> = {
    core: [],
    date_histogram: [],
    top_n: [],
    static_value: [],
  };
  for (const conversionCase of buildEsqlConversionCases()) {
    grouped[conversionCase.group].push(conversionCase);
  }
  return grouped;
};
