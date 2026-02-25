/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface Metric {
  name: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
}

interface BucketRange {
  from?: number;
  to?: number;
  label?: string;
}

interface BucketConfig {
  field: string;
  ranges: BucketRange[];
}

export function getFieldValue(item: unknown, field: string): unknown {
  if (typeof item !== 'object' || item === null) {
    return undefined;
  }

  const parts = field.split('.');
  let current: unknown = item;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function computeMetric(items: unknown[], metric: Metric): number | null {
  if (metric.operation === 'count') {
    return items.length;
  }

  const values = items
    .map((item) => getFieldValue(item, metric.field ?? ''))
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));

  if (values.length === 0) {
    return null;
  }

  switch (metric.operation) {
    case 'sum':
      return values.reduce((acc, v) => acc + v, 0);
    case 'avg':
      return values.reduce((acc, v) => acc + v, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
  }
}

export function groupItemsByKeys(items: unknown[], keys: string[]): Map<string, unknown[]> {
  const groups = new Map<string, unknown[]>();

  for (const item of items) {
    const keyParts = keys.map((key) => JSON.stringify(getFieldValue(item, key)));
    const compositeKey = keyParts.join('::');

    const group = groups.get(compositeKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(compositeKey, [item]);
    }
  }

  return groups;
}

export function assignBucket(item: unknown, config: BucketConfig): string | null {
  const value = getFieldValue(item, config.field);

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  for (const range of config.ranges) {
    const aboveFrom = range.from === undefined || value >= range.from;
    const belowTo = range.to === undefined || value < range.to;

    if (aboveFrom && belowTo) {
      return range.label ?? formatRangeLabel(range);
    }
  }

  return null;
}

function formatRangeLabel(range: BucketRange): string {
  if (range.from !== undefined && range.to !== undefined) {
    return `${range.from}-${range.to}`;
  }
  if (range.from !== undefined) {
    return `${range.from}+`;
  }
  if (range.to !== undefined) {
    return `<${range.to}`;
  }
  return '*';
}

export function parseGroupKeyValues(compositeKey: string, keys: string[]): Record<string, unknown> {
  const parts = compositeKey.split('::');
  const result: Record<string, unknown> = {};

  for (let i = 0; i < keys.length; i++) {
    try {
      result[keys[i]] = JSON.parse(parts[i]);
    } catch {
      result[keys[i]] = parts[i];
    }
  }

  return result;
}
