/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assignBucket,
  computeMetric,
  groupItemsByKeys,
  parseGroupKeyValues,
} from './aggregate_utils';
import { dataAggregateStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

interface Metric {
  name: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
}

function validateMetrics(metrics: Metric[]): { valid: true } | { valid: false; error: Error } {
  for (const metric of metrics) {
    if (metric.operation !== 'count' && !metric.field) {
      return {
        valid: false,
        error: new Error(
          `Metric "${metric.name}" uses operation "${metric.operation}" but no field was provided. Only "count" does not require a field.`
        ),
      };
    }
  }
  return { valid: true };
}

function buildAggregatedResults(
  groups: Map<string, unknown[]>,
  groupByKeys: string[],
  metrics: Metric[],
  bucketLabels: Map<string, string> | null
): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];

  for (const [compositeKey, groupItems] of groups) {
    const record = parseGroupKeyValues(compositeKey, groupByKeys);

    if (bucketLabels) {
      const bucketKey = compositeKey.split('::').pop() ?? '';
      try {
        record._bucket = JSON.parse(bucketKey);
      } catch {
        record._bucket = bucketKey;
      }
    }

    for (const metric of metrics) {
      record[metric.name] = computeMetric(groupItems, metric);
    }

    results.push(record);
  }

  return results;
}

function sortResults(
  results: Array<Record<string, unknown>>,
  orderBy: string,
  order: string
): Array<Record<string, unknown>> {
  return results.sort((a, b) => {
    const aVal = a[orderBy];
    const bVal = b[orderBy];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'desc' ? -comparison : comparison;
  });
}

export const dataAggregateStepDefinition = createServerStepDefinition({
  ...dataAggregateStepCommonDefinition,
  handler: async (context) => {
    try {
      const items = context.contextManager.renderInputTemplate(context.config.items);
      const {
        group_by: groupBy,
        metrics,
        buckets,
        order_by: orderBy,
        order,
        limit,
      } = context.input;

      if (!Array.isArray(items)) {
        return {
          error: new Error(`Expected items to be an array, but received ${typeof items}.`),
        };
      }

      if (items.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      const validation = validateMetrics(metrics);
      if (!validation.valid) {
        return { error: validation.error };
      }

      context.logger.debug(
        `Aggregating ${items.length} items by keys: ${groupBy.join(', ')} with ${
          metrics.length
        } metric(s)`
      );

      if (context.abortSignal.aborted) {
        return { error: new Error('Step was aborted before aggregation started') };
      }

      let effectiveGroupByKeys = groupBy;
      let bucketLabels: Map<string, string> | null = null;

      if (buckets) {
        bucketLabels = new Map<string, string>();
        const bucketedItems: Array<{ item: unknown; bucket: string }> = [];

        for (let i = 0; i < items.length; i++) {
          if (i % 1000 === 0 && context.abortSignal.aborted) {
            return { error: new Error('Step was aborted during bucketing') };
          }
          const bucketLabel = assignBucket(items[i], buckets);
          if (bucketLabel !== null) {
            bucketedItems.push({ item: items[i], bucket: bucketLabel });
          }
        }

        const wrappedItems = bucketedItems.map(({ item, bucket }) => ({
          ...(item as Record<string, unknown>),
          _bucket: bucket,
        }));

        effectiveGroupByKeys = [...groupBy, '_bucket'];
        const groups = groupItemsByKeys(wrappedItems, effectiveGroupByKeys);
        const results = buildAggregatedResults(groups, effectiveGroupByKeys, metrics, bucketLabels);

        return { output: applyOrderAndLimit(results, orderBy, order, limit, context.logger) };
      }

      const groups = groupItemsByKeys(items, effectiveGroupByKeys);
      const results = buildAggregatedResults(groups, effectiveGroupByKeys, metrics, null);

      return { output: applyOrderAndLimit(results, orderBy, order, limit, context.logger) };
    } catch (error) {
      context.logger.error('Failed to aggregate items', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to aggregate items'),
      };
    }
  },
});

function applyOrderAndLimit(
  results: Array<Record<string, unknown>>,
  orderBy: string | undefined,
  order: string | undefined,
  limit: number | undefined,
  logger: { debug: (msg: string) => void }
): Array<Record<string, unknown>> {
  let output = results;

  if (orderBy) {
    output = sortResults(output, orderBy, order ?? 'asc');
  }

  if (limit && limit < output.length) {
    logger.debug(`Limiting results from ${output.length} to ${limit}`);
    output = output.slice(0, limit);
  }

  logger.debug(`Aggregation complete: ${output.length} group(s)`);
  return output;
}
