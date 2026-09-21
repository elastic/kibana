/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { UI_SETTINGS, convertIntervalToEsInterval } from '@kbn/data-plugin/common';
import { TIME_SYSTEM_PARAMS, escapeEsqlColumnName } from '@kbn/esql-language';
import moment from 'moment';
import { partition } from 'lodash';
import { calculateAuto } from '@kbn/calculate-auto';
import type { DateRange, IndexPattern, OriginalColumn } from '../types';
import type {
  DateHistogramIndexPatternColumn,
  StaticValueIndexPatternColumn,
  TermsIndexPatternColumn,
} from '../datasources/operations';
import type { FormBasedLayer, GenericIndexPatternColumn } from '../datasources/types';
import { isColumnFormatted, isColumnOfType } from '../datasources/form_based/helpers';
import { AUTO_TARGET_NUMBER_OF_BUCKETS, DEFAULT_STATIC_VALUE } from './constants';
import { convertToAbsoluteDateRange } from './date_range';
import { resolveTimeShift } from './time_shift';
import type { EsqlConversionFailureReason } from './to_esql_failure_reasons';
import { buildOuterTopNFilter } from './build_outer_top_n_filter';
import { createEsAggsIdMapEntry } from './create_es_aggs_id_map_entry';
import { getTermsConversionFailure } from './get_terms_conversion_failure';
import { getToEsqlFn, getEsqlOperationMeta } from './operations/registry';
import {
  AUTO_INTERVAL,
  getTimeZoneAndInterval,
  hasDateRange,
} from './operations/date_histogram_helpers';
import type { UiSettingsReader } from './operations/types';

// esAggs column ID manipulation functions
export const extractAggId = (id: string) => id.split('.')[0].split('-')[2];

// Used for metrics and buckets ES|QL verification
interface EsqlConversionResult {
  esql: string;
  /**
   * Name of the column this fragment produces in the ES|QL result table.
   * Two Lens columns that resolve to the same output name are the same ES|QL
   * column, so the fragment is only emitted once.
   */
  outputName: string;
}
type EsqlConversion = EsqlConversionResult | EsqlQueryFailure;
const areValidEsqlConversionItems = (
  metrics: EsqlConversion[]
): metrics is EsqlConversionResult[] => metrics.every((m) => typeof m === 'object' && 'esql' in m);

/**
 * Result type for generateEsqlQuery.
 * Either a successful conversion with the ES|QL query,
 * or a failure with a specific reason.
 */
interface EsqlQuerySuccess {
  success: true;
  esql: string;
  partialRows: boolean;
  esAggsIdMap: Record<string, OriginalColumn[]>;
}

interface EsqlQueryFailure {
  success: false;
  reason: EsqlConversionFailureReason;
  operationType?: string;
}

export type EsqlQueryResult = EsqlQuerySuccess | EsqlQueryFailure;

/**
 * Type guard to check if the result is a successful ES|QL query.
 */
export const isEsqlQuerySuccess = (result: unknown): result is EsqlQuerySuccess =>
  result !== null && typeof result === 'object' && 'success' in result && result.success === true;

/**
 * Type guard to check if the result is a failed ES|QL query.
 */
export const isEsqlQueryFailure = (result: unknown): result is EsqlQueryFailure =>
  result !== null && typeof result === 'object' && 'success' in result && result.success === false;

/**
 * Helper function to create a consistent failure result for ES|QL query generation.
 */
function getEsqlQueryFailedResult(
  reason: EsqlConversionFailureReason,
  operationType?: string
): EsqlQueryFailure {
  return operationType ? { success: false, reason, operationType } : { success: false, reason };
}

/**
 * Keeps the first fragment for each ES|QL output name. Elasticsearch collapses repeated
 * expressions into a single result column, so emitting them twice yields a query whose
 * columns don't match what Lens expects.
 */
function dedupeFragmentsByOutputName(conversions: EsqlConversionResult[]): string[] {
  const seenOutputNames = new Set<string>();
  const fragments: string[] = [];

  for (const { esql: fragment, outputName } of conversions) {
    if (seenOutputNames.has(outputName)) {
      continue;
    }
    seenOutputNames.add(outputName);
    fragments.push(fragment);
  }

  return fragments;
}

/**
 * Optional mapping of column IDs to semantic role names.
 * Used to generate more meaningful ES|QL column names.
 * e.g., { 'col-123': 'max_value' } will generate
 * `EVAL static_max_value = 100` instead of `EVAL static_value = 100`.
 */
export interface ColumnRoles {
  [columnId: string]: string;
}

const SINGLE_CHAR_INTERVAL: Record<string, string> = {
  d: '1d',
  h: '1h',
  m: '1m',
  s: '1s',
  ms: '1ms',
} as const;

const DEFAULT_DATE_HISTOGRAM_INTERVAL_MS = moment.duration(1, 'h').as('ms');

/**
 * Format a name for SORT.
 * - Field paths (e.g. agent.keyword): per-segment escape — never wrap the whole path.
 * - Expression/agg output names (e.g. COUNT(bytes)): quote as a single identifier.
 */
const quoteEsqlSortField = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.includes('(') || trimmed.includes(')')) {
    return escapeEsqlColumnName(trimmed, { asExpression: true });
  }
  return escapeEsqlColumnName(trimmed);
};

interface EsqlSortKey {
  /** SORT expression, already escaped. */
  expr: string;
  direction: string;
}

/**
 * `STATS` needs an aggregation, but an alphabetically ranked outer dimension only needs the
 * grouping keys. `KEEP` drops this column before the values reach the enclosing query.
 */
const OUTER_TOP_N_GROUPING_ONLY_METRIC = 'COUNT(*)';

/** Sorting twice by the same expression is redundant; the first direction wins. */
const formatSortKeys = (keys: EsqlSortKey[]): string => {
  const seenExprs = new Set<string>();
  const clauses: string[] = [];

  for (const { expr, direction } of keys) {
    if (seenExprs.has(expr)) {
      continue;
    }
    seenExprs.add(expr);
    clauses.push(`${expr} ${direction}`);
  }

  return clauses.join(', ');
};

export function generateEsqlQuery(
  esAggEntries: Array<readonly [string, GenericIndexPatternColumn]>,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  uiSettings: UiSettingsReader,
  dateRange: DateRange,
  nowInstant: Date,
  columnRoles?: ColumnRoles
): EsqlQueryResult {
  // esql mode variables
  const partialRows = true;

  // Check for unsupported column features in layer.columns
  for (const col of Object.values(layer.columns)) {
    if (col.operationType === 'formula') {
      return getEsqlQueryFailedResult('formula_not_supported');
    }
    if (col.timeShift) {
      return getEsqlQueryFailedResult('time_shift_not_supported');
    }
    if ('sourceField' in col && indexPattern.getFieldByName(col.sourceField)?.runtime) {
      return getEsqlQueryFailedResult('runtime_field_not_supported');
    }
  }

  // indexPattern.title is the actual ES pattern
  // ES|QL Composer API docs: https://github.com/elastic/esql-js/blob/main/src/composer/README.md
  const source = `${esql.src(indexPattern.title)}`;
  const queryParts: string[] = [`FROM ${source}`];

  let timeFilter: string | undefined;
  if (indexPattern.timeFieldName) {
    const [ESQL_TIME_RANGE_START, ESQL_TIME_RANGE_END] = TIME_SYSTEM_PARAMS;
    const timeField = `${esql.col(indexPattern.timeFieldName)}`;
    timeFilter = `WHERE ${timeField} >= ${ESQL_TIME_RANGE_START} AND ${timeField} <= ${ESQL_TIME_RANGE_END}`;
    queryParts.push(timeFilter);
  }

  const histogramBarsTarget = uiSettings.get<number>(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
  const absDateRange = convertToAbsoluteDateRange(dateRange, nowInstant);

  const hasDateHistogram = esAggEntries.some(([, col]) => col.operationType === 'date_histogram');

  // Maps each ES|QL output column name to the Lens columns reading from it. Several Lens columns
  // can resolve to the same ES|QL column, so entries are appended rather than replaced, and the
  // expression is emitted only once.
  const esAggsIdMap: Record<string, OriginalColumn[]> = {};

  const [metricEsAggsEntries, bucketEsAggsEntries] = partition(
    esAggEntries,
    ([_, col]) => !col.isBucketed
  );

  // Separate static_value columns from regular metrics
  const [staticValueEntries, regularMetricEntries] = partition(
    metricEsAggsEntries,
    ([_, col]) => col.operationType === 'static_value'
  );

  // Process static value columns - these will become EVAL statements
  const staticValueEvals: string[] = [];
  staticValueEntries.forEach(([colId, col], index) => {
    const staticCol = col as StaticValueIndexPatternColumn;
    const value = staticCol.params?.value ?? `${DEFAULT_STATIC_VALUE}`;

    // Generate a column name for the static value
    // Priority: 1) semantic role name from visualization, 2) 'static_value' for single, 3) 'static_value_N' for multiple
    const roleName = columnRoles?.[colId];
    let esAggsId: string;
    if (roleName) {
      esAggsId = `static_${roleName}`;
    } else if (staticValueEntries.length === 1) {
      esAggsId = 'static_value';
    } else {
      esAggsId = `static_value_${index}`;
    }

    const format = isColumnFormatted(col) ? col.params?.format : undefined;

    // Add to esAggsIdMap so the column can be mapped in text-based layer
    esAggsIdMap[esAggsId] = [
      ...(esAggsIdMap[esAggsId] ?? []),
      ...createEsAggsIdMapEntry({
        col,
        colId,
        format,
        layer,
        indexPattern,
        uiSettings,
        dateRange,
      }),
    ];

    // Generate EVAL statement using composer literal helpers
    staticValueEvals.push(`${esAggsId} = ${esql.num(Number(value))}`);
  });

  // Process metrics (excluding static_value which is handled above)
  // Maps metric column IDs to STATS output names (alias or bare expression) for terms orderBy.
  const metricOutputNamesByColId = new Map<string, string>();
  // Same keys, but the whole STATS fragment, so outer top-N subqueries can re-aggregate it.
  const metricFragmentsByColId = new Map<string, string>();
  const metricsResult: EsqlConversion[] = regularMetricEntries.map(([colId, col]) => {
    // Check for specific unsupported operations before general toESQL check
    if (col.operationType === 'formula') {
      return getEsqlQueryFailedResult('formula_not_supported');
    }

    const toESQL = getToEsqlFn(col.operationType);
    if (!toESQL) {
      return getEsqlQueryFailedResult('function_not_supported', col.operationType);
    }
    const meta = getEsqlOperationMeta(col.operationType);

    const wrapInFilter = Boolean(meta.filterable && col.filter?.query);
    const wrapInTimeFilter =
      meta.canReduceTimeRange &&
      !hasDateHistogram &&
      col.reducedTimeRange &&
      indexPattern.timeFieldName;

    if (wrapInTimeFilter) {
      return getEsqlQueryFailedResult('reduced_time_range_not_supported');
    }

    const format =
      // 1. User-configured format in Lens (highest priority)
      (isColumnFormatted(col) ? col.params?.format : undefined) ??
      // 2. Operation-specific format
      meta.getSerializedFormat?.(col, col, indexPattern, uiSettings, dateRange) ??
      // 3. Field's default format from data view
      ('sourceField' in col
        ? col.sourceField === '___records___'
          ? { id: 'number' }
          : undefined
        : undefined);

    const rawResult = toESQL(
      {
        ...col,
        timeShift: resolveTimeShift(
          col.timeShift,
          absDateRange,
          histogramBarsTarget,
          hasDateHistogram
        ),
      },
      wrapInFilter || wrapInTimeFilter ? `${colId}-metric` : colId,
      indexPattern,
      layer,
      uiSettings,
      dateRange
    );

    if (!rawResult) {
      return getEsqlQueryFailedResult('function_not_supported', col.operationType);
    }

    let filterClause = '';
    if (wrapInFilter && col.filter) {
      const { query, language } = col.filter;
      if ((language !== 'kuery' && language !== 'lucene') || typeof query !== 'string') {
        return getEsqlQueryFailedResult('function_not_supported', col.operationType);
      }
      const cmd = language === 'kuery' ? 'KQL' : 'QSTR';
      const filteredQueryString = query.replace(/"""/g, '').trim();
      filterClause = ` WHERE ${cmd}(${esql.str(filteredQueryString)})`;
    }

    const fullStatsMetricExpression = rawResult.template + filterClause;

    const statsColumnAlias = columnRoles?.[colId];
    const statsMetricFragment = statsColumnAlias
      ? `${statsColumnAlias} = ${fullStatsMetricExpression}`
      : fullStatsMetricExpression;

    // Key must match the STATS output column name: alias if set, else the bare expression.
    // Use the same truthy check as statsMetricFragment so empty string roles map to the bare expression.
    const esAggsIdMapKey = statsColumnAlias ? statsColumnAlias : fullStatsMetricExpression;

    metricOutputNamesByColId.set(colId, esAggsIdMapKey);
    metricFragmentsByColId.set(colId, statsMetricFragment);

    esAggsIdMap[esAggsIdMapKey] = [
      ...(esAggsIdMap[esAggsIdMapKey] ?? []),
      ...createEsAggsIdMapEntry({
        col,
        colId,
        format,
        layer,
        indexPattern,
        uiSettings,
        dateRange,
      }),
    ];

    return {
      esql: statsMetricFragment,
      outputName: esAggsIdMapKey,
    } satisfies EsqlConversionResult;
  });

  // Check for metric conversion errors with a type guard
  if (!areValidEsqlConversionItems(metricsResult)) {
    const metricError = metricsResult.find(isEsqlQueryFailure);
    if (isEsqlQueryFailure(metricError)) {
      return getEsqlQueryFailedResult(
        metricError.reason,
        'operationType' in metricError ? metricError.operationType : undefined
      );
    }
    return getEsqlQueryFailedResult('function_not_supported');
  }

  // Process buckets
  const termsBucketCount = bucketEsAggsEntries.filter(([, col]) =>
    isColumnOfType<TermsIndexPatternColumn>('terms', col)
  ).length;
  const resolvedBucketExprs = new Map<number, string>();
  const bucketsResult: EsqlConversion[] = bucketEsAggsEntries.map(([colId, col], index) => {
    if (isColumnOfType<TermsIndexPatternColumn>('terms', col)) {
      const termsFailure = getTermsConversionFailure(col, { hasDateHistogram, termsBucketCount });
      if (termsFailure) {
        return getEsqlQueryFailedResult(termsFailure);
      }
    }

    const toESQL = getToEsqlFn(col.operationType);
    if (!toESQL) {
      return getEsqlQueryFailedResult('function_not_supported', col.operationType);
    }
    const meta = getEsqlOperationMeta(col.operationType);

    const wrapInFilter = Boolean(meta.filterable && col.filter?.query);
    const wrapInTimeFilter =
      meta.canReduceTimeRange &&
      !hasDateHistogram &&
      col.reducedTimeRange &&
      indexPattern.timeFieldName;

    let intervalInMs: number | undefined;
    if (isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col)) {
      const { interval } = getTimeZoneAndInterval(col, indexPattern);

      if (interval === AUTO_INTERVAL) {
        if (hasDateRange(dateRange)) {
          const { toDate, fromDate } = absDateRange;
          const absDate = new Date(toDate).getTime() - new Date(fromDate).getTime();
          const rangeDuration = moment.duration(absDate, 'ms');
          const intervalDuration = calculateAuto.near(AUTO_TARGET_NUMBER_OF_BUCKETS, rangeDuration);
          intervalInMs = intervalDuration?.as('ms') ?? DEFAULT_DATE_HISTOGRAM_INTERVAL_MS;
        } else {
          // Fall back to default 1h when date range is missing
          intervalInMs = DEFAULT_DATE_HISTOGRAM_INTERVAL_MS;
        }
      } else {
        const cleanInterval = (i: string) => SINGLE_CHAR_INTERVAL[i] ?? i;
        const esInterval = convertIntervalToEsInterval(cleanInterval(interval));
        intervalInMs = moment.duration(esInterval.value, esInterval.unit).as('ms');
      }
    }

    if (isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col)) {
      const column = col;
      if (
        column.params?.dropPartials &&
        // set to false when detached from time picker
        (indexPattern.timeFieldName === indexPattern.getFieldByName(column.sourceField)?.name ||
          !column.params?.ignoreTimeRange)
      ) {
        return getEsqlQueryFailedResult('drop_partials_not_supported');
      }

      if (column.params?.includeEmptyRows) {
        return getEsqlQueryFailedResult('include_empty_rows_not_supported');
      }
    }

    const rawResult = toESQL(
      {
        ...col,
        timeShift: resolveTimeShift(
          col.timeShift,
          absDateRange,
          histogramBarsTarget,
          hasDateHistogram
        ),
      },
      wrapInFilter || wrapInTimeFilter ? `${colId}-metric` : colId,
      indexPattern,
      layer,
      uiSettings,
      dateRange
    );

    if (!rawResult) {
      return getEsqlQueryFailedResult('function_not_supported', col.operationType);
    }

    const esAggsId = rawResult.template;
    resolvedBucketExprs.set(index, esAggsId);

    const format =
      // 1. User-configured format in Lens (highest priority)
      (isColumnFormatted(col) ? col.params?.format : undefined) ??
      // 2. Operation-specific format
      meta.getSerializedFormat?.(col, col, indexPattern, uiSettings, dateRange) ??
      // 3. Field's default format from data view (buckets don't need fallback)
      undefined;

    esAggsIdMap[esAggsId] = [
      ...(esAggsIdMap[esAggsId] ?? []),
      ...createEsAggsIdMapEntry({
        col,
        colId,
        format,
        interval: intervalInMs,
        layer,
        indexPattern,
        uiSettings,
        dateRange,
        includeSourceField: true,
      }),
    ];

    return { esql: rawResult.template, outputName: esAggsId };
  });

  // Check for bucket conversion errors with type guard
  if (!areValidEsqlConversionItems(bucketsResult)) {
    const bucketError = bucketsResult.find(isEsqlQueryFailure);
    if (isEsqlQueryFailure(bucketError)) {
      return getEsqlQueryFailedResult(
        bucketError.reason,
        'operationType' in bucketError ? bucketError.operationType : undefined
      );
    }
    return getEsqlQueryFailedResult('function_not_supported');
  }

  // Error checks above narrowed these to successful conversions, so collect their
  // fragments, keeping one per ES|QL output column
  const validMetrics = dedupeFragmentsByOutputName(metricsResult);
  const validBuckets = dedupeFragmentsByOutputName(bucketsResult);

  // Inner top-N terms = last terms bucket in order; remaining buckets are LIMIT BY groups.
  const termsBucketIndexes = bucketEsAggsEntries
    .map(([, col], index) => ({ col, index }))
    .filter(({ col }) => isColumnOfType<TermsIndexPatternColumn>('terms', col));
  const innerTermsBucket = termsBucketIndexes[termsBucketIndexes.length - 1] as
    | { col: TermsIndexPatternColumn; index: number }
    | undefined;

  if (validBuckets.length > 0) {
    const statsClause =
      validMetrics.length > 0
        ? `STATS ${validMetrics.join(', ')} BY ${validBuckets.join(', ')}`
        : undefined;

    if (innerTermsBucket) {
      // "Rank by" resolves either to the bucket's own field (alphabetical) or to the
      // STATS output name of the metric it ranks by.
      const resolveTermsSortKey = (
        col: TermsIndexPatternColumn,
        bucketIndex: number
      ): EsqlSortKey | undefined => {
        const { orderBy, orderDirection } = col.params;
        let expr: string | undefined;

        if (orderBy.type === 'alphabetical') {
          expr = resolvedBucketExprs.get(bucketIndex);
        } else if (orderBy.type === 'column') {
          expr = metricOutputNamesByColId.get(orderBy.columnId);
        }

        return expr
          ? { expr: quoteEsqlSortField(expr), direction: orderDirection.toUpperCase() }
          : undefined;
      };

      const { size } = innerTermsBucket.col.params;
      const innerSortKey = resolveTermsSortKey(innerTermsBucket.col, innerTermsBucket.index);

      if (!innerSortKey) {
        return getEsqlQueryFailedResult('terms_order_by_not_supported');
      }

      const outerBuckets = [...resolvedBucketExprs.entries()]
        .filter(([index]) => index !== innerTermsBucket.index)
        .sort(([a], [b]) => a - b);

      const outerSortKeys: EsqlSortKey[] = [];
      const outerTopNFilters: string[] = [];

      for (const [index, bucketExpr] of outerBuckets) {
        const [, col] = bucketEsAggsEntries[index];

        if (!isColumnOfType<TermsIndexPatternColumn>('terms', col)) {
          outerSortKeys.push({ expr: quoteEsqlSortField(bucketExpr), direction: 'ASC' });
          continue;
        }

        const outerSortKey = resolveTermsSortKey(col, index);
        if (!outerSortKey) {
          return getEsqlQueryFailedResult('terms_order_by_not_supported');
        }
        outerSortKeys.push(outerSortKey);

        const { orderBy: outerOrderBy, size: outerSize } = col.params;
        const scoreFragment =
          outerOrderBy.type === 'column'
            ? metricFragmentsByColId.get(outerOrderBy.columnId)
            : OUTER_TOP_N_GROUPING_ONLY_METRIC;

        if (!scoreFragment) {
          return getEsqlQueryFailedResult('terms_order_by_not_supported');
        }

        outerTopNFilters.push(
          buildOuterTopNFilter({
            source,
            timeFilter,
            groupExpr: bucketExpr,
            scoreFragment,
            sortClause: formatSortKeys([outerSortKey]),
            size: outerSize,
          })
        );
      }

      // Filters run before STATS so the aggregation only sees the kept outer values.
      queryParts.push(...outerTopNFilters);
      if (statsClause) {
        queryParts.push(statsClause);
      }

      // This SORT decides which rows survive LIMIT BY, so it carries the inner ranking only.
      queryParts.push(`SORT ${formatSortKeys([innerSortKey])}`);

      if (outerBuckets.length === 0) {
        queryParts.push(`LIMIT ${size}`);
      } else {
        queryParts.push(`LIMIT ${size} BY ${outerBuckets.map(([, expr]) => expr).join(', ')}`);
        // The ranking above is consumed by LIMIT BY, so outer dimensions are ordered
        // afterwards; the inner key trails it to keep each group internally ranked.
        queryParts.push(`SORT ${formatSortKeys([...outerSortKeys, innerSortKey])}`);
      }
    } else {
      if (statsClause) {
        queryParts.push(statsClause);
      }

      // Build sort fields, excluding date fields (date_histogram columns).
      // Buckets that resolved to the same expression are a single ES|QL column, so sort once.
      const sortExprs: string[] = [];
      bucketEsAggsEntries.forEach(([, col], index) => {
        if (col.dataType === 'date') {
          return;
        }
        const bucketExpr = resolvedBucketExprs.get(index);
        if (bucketExpr === undefined || sortExprs.includes(bucketExpr)) {
          return;
        }
        sortExprs.push(bucketExpr);
      });
      const sortFields = sortExprs.map((bucketExpr) => `${quoteEsqlSortField(bucketExpr)} ASC`);

      // Only add SORT clause if there are non-date fields to sort by
      if (sortFields.length > 0) {
        queryParts.push(`SORT ${sortFields.join(', ')}`);
      }
    }
  } else {
    if (validMetrics.length > 0) {
      const statsBody = validMetrics.join(', ');
      queryParts.push(`STATS ${statsBody}`);
    }
  }

  // Add EVAL statements for static values after STATS/SORT
  if (staticValueEvals.length > 0) {
    queryParts.push(`EVAL ${staticValueEvals.join(', ')}`);
  }

  const queryString = queryParts.join(' | ');
  try {
    const query = esql(queryString);
    return {
      success: true,
      esql: query.print('basic'),
      partialRows,
      esAggsIdMap,
    };
  } catch (e) {
    return getEsqlQueryFailedResult('unknown');
  }
}
