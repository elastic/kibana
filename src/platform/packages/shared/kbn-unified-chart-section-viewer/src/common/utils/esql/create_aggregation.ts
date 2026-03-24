/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import { esql, synth, BasicPrettyPrinter, isCommand, isFunctionExpression } from '@elastic/esql';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import { isLegacyHistogram } from '../legacy_histogram';

type Params = Record<string, string | number | boolean | null>;
interface AggegationTemplateParams {
  type: ES_FIELD_TYPES;
  instrument: MappingTimeSeriesMetricType;
  placeholderName: string;
  customFunction?: string;
}

// Helper function to safely extract the target AST node
function getFunctionNodeFromAst(ast: ESQLAstQueryExpression) {
  const statsCommand = ast.commands?.find((c) => isCommand(c) && c.name.toLowerCase() === 'stats');
  if (statsCommand) {
    const functionNode = statsCommand.args?.[0];
    if (functionNode && isFunctionExpression(functionNode)) {
      return functionNode;
    }
  }
  return null;
}

/**
 * Takes an ES|QL function string with placeholders and a parameters object,
 * and returns the function string with the placeholders substituted and correctly escaped.
 *
 * This function works by using the `@elastic/esql` composer to build a temporary query,
 * which handles the AST substitution and escaping internally.
 *
 * @param functionString An ES|QL function string with placeholders (e.g., "AVG(??metricField)").
 * @param params A parameters object (e.g., { metricField: 'system.load.1m' }).
 * @returns The transformed function string (e.g., "AVG(system.load.`1m`)").
 */
export function replaceFunctionParams(functionString: string, params: Params): string {
  try {
    // Build a temporary query with the function string, then use setParam + inlineParams
    // to handle placeholder substitution and escaping via the composer API.
    const tempQuery = esql(`TS metrics-* | STATS ${functionString}`);
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      const strValue = String(value);
      // ?? placeholders represent column/field names - use synth.col for proper escaping
      if (functionString.includes(`??${key}`)) {
        const columnParts = strValue.split('.');
        tempQuery.setParam(key, synth.col(columnParts));
      } else {
        // ? placeholders represent literal values
        tempQuery.setParam(key, typeof value === 'number' || typeof value === 'boolean' ? value : strValue);
      }
    }
    tempQuery.inlineParams();
    const functionNode = getFunctionNodeFromAst(tempQuery.ast);

    if (functionNode) {
      return BasicPrettyPrinter.print(functionNode).trim();
    }

    return functionString;
  } catch (e) {
    // If parsing or any other step fails, return the original string as a safe fallback.
    return functionString;
  }
}

/**
 * Determines the ES|QL aggregation function template based on the instrument and field type.
 *
 * @param type - The ES field type (e.g., 'histogram', 'exponential_histogram').
 * @param instrument - The metric instrument type (e.g., 'counter', 'histogram', 'gauge').
 * @param placeholderName - The name of the placeholder to use in the template.
 * @param customFunction - Optional custom aggregation function to use.
 * @returns The ES|QL aggregation function template string. Legacy histograms (type + instrument both histogram) use PERCENTILE(TO_TDIGEST(...), 95).
 */
export function getAggregationTemplate({
  type,
  instrument,
  placeholderName,
  customFunction,
}: AggegationTemplateParams): string {
  if (customFunction) {
    return `${customFunction}(??${placeholderName})`;
  }

  if (isLegacyHistogram(type, instrument)) {
    return `PERCENTILE(TO_TDIGEST(??${placeholderName}), 95)`;
  }

  if (type === 'exponential_histogram' || type === 'tdigest') {
    return `PERCENTILE(??${placeholderName}, 95)`;
  }

  if (instrument === 'counter') {
    return `SUM(RATE(??${placeholderName}))`;
  }

  return `AVG(??${placeholderName})`;
}

/**
 * Creates the metric aggregation part of an ES|QL query.
 * It returns:
 * - For legacy histogram (field type + instrument both histogram): `PERCENTILE(TO_TDIGEST(...), 95)`
 * - For `histogram` instrument: `PERCENTILE(..., 95)` if type is `exponential_histogram` or `tdigest`
 * - `SUM(RATE(...))` for counter instruments
 * - `AVG(...)` for other metric types
 *
 * If a metric name is provided, it will be properly escaped and substituted.
 *
 * @param type - The ES field type (e.g., 'histogram', 'exponential_histogram', 'tdigest').
 * @param instrument - The metric instrument type (e.g., 'counter', 'histogram', 'gauge').
 * @param metricName - The actual name of the metric field to aggregate.
 * @param placeholderName - The name of the placeholder to use in the template.
 * @param customFunction - Optional custom aggregation function to use for default case.
 * @returns The ES|QL aggregation string.
 */
export function createMetricAggregation({
  type,
  instrument,
  metricName,
  placeholderName = 'metricName',
  customFunction,
}: {
  type: ES_FIELD_TYPES;
  instrument: MappingTimeSeriesMetricType;
  metricName?: string;
  placeholderName?: string;
  customFunction?: string;
}) {
  const functionTemplate = getAggregationTemplate({
    type,
    instrument,
    placeholderName,
    customFunction,
  });
  return metricName
    ? replaceFunctionParams(functionTemplate, { [placeholderName]: metricName })
    : functionTemplate;
}

/**
 * Creates the time bucketing part of an ES|QL query.
 *
 * @param targetBuckets - The desired number of buckets for the time series.
 * @param timestampField - The name of the timestamp field.
 * @returns The ES|QL BUCKET function string.
 */
export function createTimeBucketAggregation({
  targetBuckets = 100,
  timestampField = '@timestamp',
}: {
  targetBuckets?: number;
  timestampField?: string;
}) {
  return `BUCKET(${timestampField}, ${targetBuckets}, ?_tstart, ?_tend)`;
}
