/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataAggregateStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

interface MetricDefinition {
  type: 'sum' | 'avg' | 'min' | 'max' | 'count';
  field: string;
}

interface AggregationGroup {
  key: string;
  items: unknown[];
  result: Record<string, unknown>;
}

/**
 * Builds a unique string key from an item based on the specified group field names.
 *
 * This function creates a composite key by extracting values from the specified fields
 * and joining them together. JSON.stringify is used to handle complex values (objects,
 * arrays, null, undefined) consistently.
 *
 * @example Single key
 * const item = { status: 'open', priority: 'high' };
 * buildGroupKey(item, ['status']);
 * // Returns: '"open"'
 *
 * @example Multiple keys
 * const item = { region: 'North', product: 'Laptop' };
 * buildGroupKey(item, ['region', 'product']);
 * // Returns: '"North"::"Laptop"'
 *
 * @example Null values
 * const item = { status: null };
 * buildGroupKey(item, ['status']);
 * // Returns: 'null'
 */
function buildGroupKey(item: unknown, groupByFields: string[]): string {
  if (typeof item !== 'object' || item === null) {
    return JSON.stringify(null);
  }

  const keyParts = groupByFields.map((field) => {
    const value = (item as Record<string, unknown>)[field];
    return JSON.stringify(value);
  });

  return keyParts.join('::');
}

/**
 * Extracts the actual values for group key fields from an item.
 *
 * This function builds a record containing the group key field names and their
 * corresponding values from the item. Null/undefined values are normalized to null.
 *
 * @example
 * const item = { status: 'open', priority: 'high', age: 5 };
 * extractGroupKeyValues(item, ['status', 'priority']);
 * // Returns: { status: 'open', priority: 'high' }
 */
function extractGroupKeyValues(item: unknown, groupByFields: string[]): Record<string, unknown> {
  if (typeof item !== 'object' || item === null) {
    return groupByFields.reduce((acc, field) => {
      acc[field] = null;
      return acc;
    }, {} as Record<string, unknown>);
  }

  return groupByFields.reduce((acc, field) => {
    acc[field] = (item as Record<string, unknown>)[field] ?? null;
    return acc;
  }, {} as Record<string, unknown>);
}

/**
 * Computes an aggregation metric over a collection of items.
 *
 * Supports count, sum, avg, min, and max operations. For numeric operations,
 * only valid numeric values are included in the calculation. Non-numeric or
 * NaN values are filtered out.
 *
 * @example Count metric
 * computeMetric([{a: 1}, {a: 2}], { type: 'count', field: '' });
 * // Returns: 2
 *
 * @example Average metric
 * computeMetric([{age: 5}, {age: 10}, {age: 'invalid'}], { type: 'avg', field: 'age' });
 * // Returns: 7.5 (invalid value is ignored)
 *
 * @returns The computed metric value, or null if no valid values exist for numeric operations
 */
function computeMetric(items: unknown[], metricDef: MetricDefinition): unknown {
  const { type, field } = metricDef;

  if (type === 'count') {
    return items.length;
  }

  const values: number[] = [];

  for (const item of items) {
    if (typeof item === 'object' && item !== null) {
      const value = (item as Record<string, unknown>)[field];
      if (typeof value === 'number' && !isNaN(value)) {
        values.push(value);
      }
    }
  }

  if (values.length === 0) {
    return null;
  }

  switch (type) {
    case 'sum':
      return values.reduce((acc, val) => acc + val, 0);
    case 'avg':
      return values.reduce((acc, val) => acc + val, 0) / values.length;
    case 'min':
      return values.reduce((min, val) => (val < min ? val : min), values[0]);
    case 'max':
      return values.reduce((max, val) => (val > max ? val : max), values[0]);
    default:
      return null;
  }
}

/**
 * Sorts aggregation results by a specified field.
 *
 * Creates a copy of the results array before sorting to avoid mutating the input.
 * Handles null/undefined values by placing them at the end. Supports numeric,
 * string, and mixed-type comparisons.
 *
 * @example
 * const results = [{ status: 'open', count: 5 }, { status: 'closed', count: 10 }];
 * sortResults(results, 'count', 'desc');
 * // Returns: [{ status: 'closed', count: 10 }, { status: 'open', count: 5 }]
 */
function sortResults(
  results: Array<Record<string, unknown>>,
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Array<Record<string, unknown>> {
  return [...results].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortOrder === 'desc' ? -comparison : comparison;
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
        sort_by: sortBy,
        sort_order: sortOrder,
        limit,
      } = context.input;

      if (!Array.isArray(items)) {
        context.logger.error('Input items is not an array');
        return {
          error: new Error(
            `Expected items to be an array, but received ${typeof items}. Please provide an array of items to aggregate.`
          ),
        };
      }

      if (items.length === 0) {
        context.logger.debug('Input array is empty, returning empty array');
        return { output: [] };
      }

      const groupByFields = Array.isArray(groupBy) ? groupBy : [groupBy];

      if (groupByFields.length === 0) {
        context.logger.error('group_by must be a non-empty string or array');
        return {
          error: new Error('group_by must be a non-empty string or array of field names'),
        };
      }

      if (Object.keys(metrics).length === 0) {
        context.logger.error('metrics must be a non-empty object');
        return {
          error: new Error('metrics must be a non-empty object with at least one metric'),
        };
      }

      context.logger.debug(
        `Aggregating ${items.length} items by [${groupByFields.join(', ')}] with ${
          Object.keys(metrics).length
        } metrics`
      );

      const groups = new Map<string, AggregationGroup>();

      for (const item of items) {
        const keyString = buildGroupKey(item, groupByFields);
        let group = groups.get(keyString);

        if (!group) {
          const keyValues = extractGroupKeyValues(item, groupByFields);
          group = {
            key: keyString,
            items: [],
            result: keyValues,
          };
          groups.set(keyString, group);
        }

        group.items.push(item);
      }

      context.logger.debug(`Created ${groups.size} unique groups`);

      let results: Array<Record<string, unknown>> = [];

      for (const group of groups.values()) {
        const record = { ...group.result };

        for (const [metricName, metricDef] of Object.entries(metrics)) {
          record[metricName] = computeMetric(group.items, metricDef);
        }

        results.push(record);
      }

      if (sortBy) {
        context.logger.debug(`Sorting results by ${sortBy} ${sortOrder}`);
        results = sortResults(results, sortBy, sortOrder);
      }

      if (limit && limit > 0) {
        context.logger.debug(`Limiting results to ${limit} records`);
        results = results.slice(0, limit);
      }

      context.logger.debug(`Aggregation complete: ${results.length} groups returned`);

      return { output: results };
    } catch (error) {
      context.logger.error('Failed to aggregate items', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to aggregate items'),
      };
    }
  },
});
