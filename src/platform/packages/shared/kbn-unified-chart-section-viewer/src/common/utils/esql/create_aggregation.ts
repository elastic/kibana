/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  Parser,
  BasicPrettyPrinter,
  isCommand,
  isFunctionExpression,
  type ESQLAstQueryExpression,
} from '@kbn/esql-language';
import { replaceParameters } from '@kbn/esql-composer';
import type { MetricField } from '../../../types';

type Params = Record<string, string | number | boolean | null>;
interface AggegationTemplateParams {
  type: MetricField['type'];
  instrument: MetricField['instrument'];
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
 * This function works by using the `@kbn/esql-composer` to build a temporary query,
 * which handles the AST substitution and escaping internally.
 *
 * @param functionString An ES|QL function string with placeholders (e.g., "AVG(??metricField)").
 * @param params A parameters object (e.g., { metricField: 'system.load.1m' }).
 * @returns The transformed function string (e.g., "AVG(system.load.`1m`)").
 */
export function replaceFunctionParams(functionString: string, params: Params): string {
  try {
    // 1. To parse the function string fragment, wrap it in a minimal, valid query.
    const tempQuery = `TS metrics-* | STATS ${functionString}`;
    const { root: ast } = Parser.parse(tempQuery);

    // 2. Use the exported `replaceParameters` function to perform the substitution.
    replaceParameters(ast, params);

    // 3. Extract the modified function node from the temporary AST.
    const functionNode = getFunctionNodeFromAst(ast);

    if (functionNode) {
      // 4. Print only the function node back to a string.
      return BasicPrettyPrinter.print(functionNode).trim();
    }

    // Fallback if the AST structure isn't what we expect.
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
 * @returns The ES|QL aggregation function template string.
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
 * - For `histogram` instrument:
 *   - `PERCENTILE(..., 95)` if type is `exponential_histogram or tdigest`
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
  type: MetricField['type'];
  instrument?: MetricField['instrument'];
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
