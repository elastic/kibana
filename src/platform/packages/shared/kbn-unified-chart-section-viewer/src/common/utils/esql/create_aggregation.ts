/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import { synth, BasicPrettyPrinter } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { FunctionNames } from '@kbn/esql-language';
import { isLegacyHistogram } from '../legacy_histogram';
import { resolveConflictingFieldTypes } from './resolve_conflicting_field_types';
import type { MetricsGridSettings } from '../../../types';
import {
  HISTOGRAM_PERCENTILE_VALUES,
  METRICS_GRID_SETTINGS_DEFAULTS,
} from '../../../components/flyout/metrics_grid_settings_flyout/constants';

/**
 * Gets the appropriate casting function name for a field type.
 * @param fieldType - The target field type
 * @returns The TO_* function name (e.g., 'TO_DOUBLE', 'TO_LONG'), or undefined if no cast is needed
 */
function getCastFunctionForType(fieldType: ES_FIELD_TYPES | undefined): string | undefined {
  switch (fieldType) {
    case ES_FIELD_TYPES.DOUBLE:
      return FunctionNames.TO_DOUBLE;
    case ES_FIELD_TYPES.LONG:
      return FunctionNames.TO_LONG;
    default:
      return undefined;
  }
}

/**
 * When multiple field types are present, resolves them to a single cast
 * expression if compatible. For incompatible types, the field is returned
 * uncast so Lens can surface its own error.
 */
function applyCastIfNeeded(types: ES_FIELD_TYPES[], field: ESQLAstExpression): ESQLAstExpression {
  if (types.length <= 1) return field;

  const resolvedType = resolveConflictingFieldTypes(types);
  if (resolvedType) {
    const castFn = getCastFunctionForType(resolvedType);
    if (castFn) {
      return synth.exp`${synth.kwd(castFn)}(${field})`;
    }
  }
  return field;
}

function resolvePercentileValue(settings: MetricsGridSettings): number {
  return HISTOGRAM_PERCENTILE_VALUES[settings.histogramPercentile];
}

/**
 * Builds an ES|QL aggregation expression AST node using `synth.exp` template
 * literals. Accepts any expression node -- a resolved column (`synth.col`) or
 * an unresolved placeholder (`synth.dpar`) -- and wraps it in the correct
 * aggregation function based on the field type and instrument.
 */
function buildAggregationNode(
  types: ES_FIELD_TYPES[],
  instrument: MappingTimeSeriesMetricType,
  field: ESQLAstExpression,
  customFunction?: string,
  gridSettings?: MetricsGridSettings
): ESQLAstExpression | undefined {
  const resolvedField = applyCastIfNeeded(types, field);
  const settings = gridSettings ?? METRICS_GRID_SETTINGS_DEFAULTS;
  const primaryType = types[0];

  if (customFunction) {
    return synth.exp`${synth.kwd(customFunction)}(${resolvedField})`;
  }

  if (isLegacyHistogram(primaryType, instrument)) {
    const percentile = resolvePercentileValue(settings);
    return synth.exp`${synth.kwd(
      FunctionNames.PERCENTILE.toUpperCase()
    )}(TO_TDIGEST(${resolvedField}), ${percentile})`;
  }

  if (primaryType === 'exponential_histogram' || primaryType === 'tdigest') {
    const percentile = resolvePercentileValue(settings);
    return synth.exp`${synth.kwd(
      FunctionNames.PERCENTILE.toUpperCase()
    )}(${resolvedField}, ${percentile})`;
  }

  if (instrument === 'counter') {
    const fn = settings.counterAggregation.toUpperCase();
    return synth.exp`${synth.kwd(fn)}(RATE(${resolvedField}))`;
  }

  const fn = settings.gaugeAggregation.toUpperCase();
  return synth.exp`${synth.kwd(fn)}(${resolvedField})`;
}

/**
 * Creates the metric aggregation part of an ES|QL query.
 * It returns:
 * - For legacy histogram (field type + instrument both histogram): `PERCENTILE(TO_TDIGEST(...), 95)`
 * - For `histogram` instrument: `PERCENTILE(..., 95)` if type is `exponential_histogram` or `tdigest`
 * - `SUM(RATE(...))` for counter instruments
 * - `AVG(...)` for other metric types
 *
 * When multiple field types are present (from different backing indices with conflicting mappings),
 * the aggregation will wrap the field in an appropriate casting function (e.g., TO_DOUBLE) to resolve the ambiguity.
 *
 * When `metricName` is provided the column is resolved and properly escaped.
 * Otherwise a `??placeholderName` parameter placeholder is emitted.
 *
 * @param types - The ES field types array (for conflicting mappings across backing indices).
 * @param instrument - The metric instrument type (e.g., 'counter', 'histogram', 'gauge').
 * @param metricName - The actual name of the metric field to aggregate.
 * @param placeholderName - The name of the placeholder to use in the template.
 * @param customFunction - Optional custom aggregation function to use for default case.
 * @param gridSettings - Optional per-`metric_type` aggregation overrides (counter/gauge/histogram).
 * @returns The ES|QL aggregation string.
 */
export function createMetricAggregation({
  types,
  instrument,
  metricName,
  placeholderName = 'metricName',
  customFunction,
  gridSettings,
}: {
  types: ES_FIELD_TYPES[];
  instrument: MappingTimeSeriesMetricType;
  metricName?: string;
  placeholderName?: string;
  customFunction?: string;
  gridSettings?: MetricsGridSettings;
}): string {
  const field = metricName ? synth.col(metricName.split('.')) : synth.dpar(placeholderName);
  const node = buildAggregationNode(types, instrument, field, customFunction, gridSettings);
  if (!node) {
    return '';
  }
  return BasicPrettyPrinter.print(node).trim();
}

/**
 * Creates the time bucketing part of an ES|QL query using `TBUCKET`,
 * which automatically resolves the timestamp field via the Kibana timestamp filter.
 *
 * @param targetBuckets - The desired number of buckets for the time series.
 * @returns The ES|QL TBUCKET function string.
 */
export function createTimeBucketAggregation({ targetBuckets = 100 }: { targetBuckets?: number }) {
  return `TBUCKET(${targetBuckets})`;
}
