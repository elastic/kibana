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
 * Format a result column reference for SORT / LIMIT BY.
 * - Field paths (e.g. agent.keyword): per-segment escape — never wrap the whole path.
 * - Expression/agg output names (e.g. COUNT(bytes), BUCKET(timestamp, 1 day)): quote as a
 *   single identifier.
 */
const quoteEsqlColumnRef = (name: string): string => {
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

/**
 * Name of the column holding an outer dimension's ranking metric. It must differ from the
 * metric's own output name, which the leaf `STATS` also produces.
 */
const getOuterRankAlias = (sourceField: string): string =>
  `rank_${sourceField.replace(/[^A-Za-z0-9_]/g, '_')}`;

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
  // Same keys, but the unaliased STATS expression, so an outer top-N rank can re-aggregate it
  // under its own alias.
  const metricExpressionsByColId = new Map<string, string>();
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
    metricExpressionsByColId.set(colId, fullStatsMetricExpression);

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
  const termsBuckets = bucketEsAggsEntries.flatMap(([, col], index) =>
    isColumnOfType<TermsIndexPatternColumn>('terms', col) ? [{ col, index }] : []
  );

  // Lens nests buckets in column order: the last Top values dimension is the innermost one,
  // buckets before it are its outer groups (`LIMIT n BY`) and buckets after it, such as a date
  // histogram, split each of its values further.
  const innerTermsBucket = termsBuckets.at(-1);
  const leadingBucketEntries = innerTermsBucket
    ? bucketEsAggsEntries.slice(0, innerTermsBucket.index)
    : [];
  const hasTrailingBuckets = innerTermsBucket
    ? innerTermsBucket.index < bucketEsAggsEntries.length - 1
    : false;
  // An outer Top values dimension is ranked over the whole data set, so a non-terms bucket
  // above it (top N per date bucket) cannot be expressed with the `IN (subquery)` filter.
  const firstLeadingTermsIndex = leadingBucketEntries.findIndex(([, col]) =>
    isColumnOfType<TermsIndexPatternColumn>('terms', col)
  );
  const hasOuterTermsBelowOtherBucket =
    firstLeadingTermsIndex > -1 &&
    leadingBucketEntries
      .slice(0, firstLeadingTermsIndex)
      .some(([, col]) => !isColumnOfType<TermsIndexPatternColumn>('terms', col));

  // Unsupported when a Top values sits under a non-terms leading bucket, or when both leading
  // and trailing exist (e.g. terms, terms, date_histogram). Trailing buckets alone (Top values
  // above a date histogram) are handled as a global top-N time series below.
  const hasUnsupportedDateHistogramNesting =
    hasOuterTermsBelowOtherBucket || (hasTrailingBuckets && leadingBucketEntries.length > 0);

  const termsConversionContext = {
    hasUnsupportedDateHistogramNesting,
    termsBucketCount: termsBuckets.length,
  };
  // Fail fast on terms blockers before building bucket expressions; metric
  // failures above still take precedence. One reason per terms column; take the first.
  const termsFailureReason = termsBuckets
    .map(({ col }) => getTermsConversionFailure(col, termsConversionContext))
    .find((reason): reason is EsqlConversionFailureReason => reason !== undefined);
  if (termsFailureReason) {
    return getEsqlQueryFailedResult(termsFailureReason);
  }

  const resolvedBucketExprs = new Map<number, string>();
  const usedBucketAliases = new Set<string>();
  const bucketAliasesByExpression = new Map<string, string>();
  const bucketsResult: EsqlConversion[] = bucketEsAggsEntries.map(([colId, col], index) => {
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

    if (
      isColumnOfType<DateHistogramIndexPatternColumn>('date_histogram', col) &&
      col.params?.includeEmptyRows
    ) {
      return getEsqlQueryFailedResult('include_empty_rows_not_supported');
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

    // Use source field name as alias for bucket expressions containing named params
    // to ensure stable column names in ES|QL results (params get resolved to literal values)
    const needsAlias =
      rawResult.template.includes('?_tstart') || rawResult.template.includes('?_tend');
    let bucketAlias = bucketAliasesByExpression.get(rawResult.template);
    if (!bucketAlias) {
      bucketAlias = needsAlias && 'sourceField' in col ? col.sourceField : undefined;
      // Guard against alias collisions between different expressions. Identical
      // expressions reuse their existing alias so duplicate columns still collapse.
      if (bucketAlias && usedBucketAliases.has(bucketAlias)) {
        bucketAlias = `${bucketAlias}_${colId}`;
      }
      if (bucketAlias) {
        usedBucketAliases.add(bucketAlias);
        bucketAliasesByExpression.set(rawResult.template, bucketAlias);
      }
    }
    const esAggsId = bucketAlias ?? rawResult.template;
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

  if (validBuckets.length > 0) {
    // Alias bucket expressions that use named params so column names are stable.
    // `esql.col()` escapes alias names that are not valid bare identifiers
    // (e.g. `my-field` -> `` `my-field` ``), matching the raw column name in results.
    const uniqueBucketsByOutputName = new Map<string, string>();
    bucketsResult.forEach(({ outputName, esql: expression }) => {
      if (!uniqueBucketsByOutputName.has(outputName)) {
        uniqueBucketsByOutputName.set(outputName, expression);
      }
    });
    const aliasedBuckets = Array.from(uniqueBucketsByOutputName, ([outputName, expression]) =>
      outputName !== expression ? `${esql.col(outputName)} = ${expression}` : expression
    );
    const buildStatsClause = (leadingGroups: string[] = []): string | undefined =>
      validMetrics.length > 0
        ? `STATS ${validMetrics.join(', ')} BY ${[...leadingGroups, ...aliasedBuckets].join(', ')}`
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
          ? { expr: quoteEsqlColumnRef(expr), direction: orderDirection.toUpperCase() }
          : undefined;
      };

      const { size, orderBy, orderDirection } = innerTermsBucket.col.params;
      const innerSortKey = resolveTermsSortKey(innerTermsBucket.col, innerTermsBucket.index);

      if (!innerSortKey) {
        return getEsqlQueryFailedResult('terms_rank_metric_not_supported');
      }

      const fieldExpr = resolvedBucketExprs.get(innerTermsBucket.index);
      if (fieldExpr === undefined) {
        return getEsqlQueryFailedResult('function_not_supported');
      }

      // Top values above a date histogram: pick the global top N, then plot those series over
      // time. Reuses the outer-terms `IN (subquery)` filter; no `LIMIT n` / `LIMIT n BY` (the
      // date histogram multiplies rows after the series set is fixed).
      const isGlobalTopNTimeSeries = hasTrailingBuckets && leadingBucketEntries.length === 0;

      if (isGlobalTopNTimeSeries) {
        const trailingSortKeys: EsqlSortKey[] = [...resolvedBucketExprs.entries()]
          .filter(([index]) => index > innerTermsBucket.index)
          .sort(([a], [b]) => a - b)
          .map(([, expr]) => ({
            expr: quoteEsqlColumnRef(expr),
            direction: 'ASC',
          }));

        let scoreFragment: string;
        let seriesSortKey: EsqlSortKey;
        let rankAlias: string | undefined;

        if (orderBy.type === 'column') {
          const metricExpression = metricExpressionsByColId.get(orderBy.columnId);
          if (!metricExpression) {
            return getEsqlQueryFailedResult('terms_rank_metric_not_supported');
          }
          rankAlias = getOuterRankAlias(innerTermsBucket.col.sourceField);
          scoreFragment = `${rankAlias} = ${metricExpression}`;
          seriesSortKey = { expr: rankAlias, direction: orderDirection.toUpperCase() };
        } else {
          // Alphabetical: COUNT(*) is only a placeholder so the subquery can LIMIT; series
          // order follows the field.
          scoreFragment = OUTER_TOP_N_GROUPING_ONLY_METRIC;
          seriesSortKey = {
            expr: quoteEsqlColumnRef(fieldExpr),
            direction: orderDirection.toUpperCase(),
          };
        }

        queryParts.push(
          buildOuterTopNFilter({
            source,
            timeFilter,
            groupExpr: fieldExpr,
            scoreFragment,
            sortClause: formatSortKeys([seriesSortKey]),
            size,
          })
        );

        if (rankAlias) {
          queryParts.push(`INLINE STATS ${scoreFragment} BY ${fieldExpr}`);
        }

        const statsClause = buildStatsClause(rankAlias ? [rankAlias] : []);
        if (statsClause) {
          queryParts.push(statsClause);
        }

        queryParts.push(`SORT ${formatSortKeys([seriesSortKey, ...trailingSortKeys])}`);

        if (rankAlias) {
          queryParts.push(`DROP ${rankAlias}`);
        }
      } else {
        // Only buckets above the inner Top values group its `LIMIT n BY`.
        const outerBuckets = [...resolvedBucketExprs.entries()]
          .filter(([index]) => index < innerTermsBucket.index)
          .sort(([a], [b]) => a - b);

        const outerSortKeys: EsqlSortKey[] = [];
        const outerTopNFilters: string[] = [];
        // The leaf STATS holds the ranking metric per (outer, inner) pair, but a metric-ranked
        // outer dimension is ordered by that metric per outer value, so INLINE STATS computes it
        // beforehand as a rank column.
        const outerRankStats: string[] = [];
        const outerRankAliases: string[] = [];

        for (const [index, bucketExpr] of outerBuckets) {
          const [, col] = bucketEsAggsEntries[index];

          if (!isColumnOfType<TermsIndexPatternColumn>('terms', col)) {
            outerSortKeys.push({ expr: quoteEsqlColumnRef(bucketExpr), direction: 'ASC' });
            continue;
          }

          const {
            orderBy: outerOrderBy,
            orderDirection: outerDirection,
            size: outerSize,
          } = col.params;
          let outerSortKey: EsqlSortKey | undefined;
          let scoreFragment: string | undefined;

          if (outerOrderBy.type === 'column') {
            const metricExpression = metricExpressionsByColId.get(outerOrderBy.columnId);
            if (metricExpression) {
              const rankAlias = getOuterRankAlias(col.sourceField);
              scoreFragment = `${rankAlias} = ${metricExpression}`;
              outerSortKey = { expr: rankAlias, direction: outerDirection.toUpperCase() };
              outerRankStats.push(`INLINE STATS ${scoreFragment} BY ${bucketExpr}`);
              outerRankAliases.push(rankAlias);
            }
          } else {
            outerSortKey = resolveTermsSortKey(col, index);
            scoreFragment = OUTER_TOP_N_GROUPING_ONLY_METRIC;
          }

          if (!outerSortKey || !scoreFragment) {
            return getEsqlQueryFailedResult('terms_rank_metric_not_supported');
          }
          outerSortKeys.push(outerSortKey);

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
        queryParts.push(...outerTopNFilters, ...outerRankStats);
        // Rank columns are constant per outer value, so grouping by them keeps the same groups
        // and only carries them through STATS.
        const statsClause = buildStatsClause(outerRankAliases);
        if (statsClause) {
          queryParts.push(statsClause);
        }

        // This SORT decides which rows survive LIMIT BY, so it carries the inner ranking only.
        queryParts.push(`SORT ${formatSortKeys([innerSortKey])}`);

        if (outerBuckets.length === 0) {
          queryParts.push(`LIMIT ${size}`);
        } else {
          // LIMIT BY groups by result column name, so expression names such as BUCKET(...) are quoted.
          queryParts.push(
            `LIMIT ${size} BY ${outerBuckets
              .map(([, expr]) => quoteEsqlColumnRef(expr))
              .join(', ')}`
          );
          // The ranking above is consumed by LIMIT BY, so outer dimensions are ordered
          // afterwards; the inner key trails it to keep each group internally ranked.
          queryParts.push(`SORT ${formatSortKeys([...outerSortKeys, innerSortKey])}`);

          // No Lens column reads the rank columns, so the result keeps the chart's columns only.
          if (outerRankAliases.length > 0) {
            queryParts.push(`DROP ${outerRankAliases.join(', ')}`);
          }
        }
      }
    } else {
      const statsClause = buildStatsClause();
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
      const sortFields = sortExprs.map((bucketExpr) => `${quoteEsqlColumnRef(bucketExpr)} ASC`);

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
