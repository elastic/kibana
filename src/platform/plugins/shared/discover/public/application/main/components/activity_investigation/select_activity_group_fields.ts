/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const CATEGORICAL_TYPES = new Set(['keyword', 'boolean', 'ip']);
// Numeric columns summed per bucket; counters and unsigned longs are not summed.
const SUMMABLE_TYPES = new Set(['long', 'integer', 'double']);

// Exact technical names, not a blanket exclusion of IDs: entity IDs can be useful actors.
const EXCLUDED_FIELDS = new Set([
  '_id',
  '_version',
  '_seq_no',
  '_primary_term',
  '_score',
  'ecs.version',
  'trace.id',
  'span.id',
  'parent.id',
  'transaction.id',
  'trace_id',
  'span_id',
  'parent_span_id',
]);

interface ActivityGroupField {
  readonly name: string;
  readonly type: string;
}

/** Prioritizes compatible profile fields without excluding custom fields or truncating the pool. */
export const selectActivityGroupFields = <T extends ActivityGroupField>(
  columns: readonly T[],
  recommendedFields: readonly string[] = []
): T[] => {
  const recommended = new Set(recommendedFields);
  const prioritized: T[] = [];
  const remaining: T[] = [];

  for (const column of columns) {
    if (!CATEGORICAL_TYPES.has(column.type) || EXCLUDED_FIELDS.has(column.name)) continue;

    if (recommended.has(column.name)) {
      prioritized.push(column);
    } else {
      remaining.push(column);
    }
  }

  return [...prioritized, ...remaining];
};

/** Numeric output columns whose per-bucket SUM is analyzed, profile fields first. */
export const selectActivitySumFields = <T extends ActivityGroupField>(
  columns: readonly T[],
  recommendedFields: readonly string[] = []
): T[] => {
  const recommended = new Set(recommendedFields);
  const candidates = columns.filter(
    ({ name, type }) => SUMMABLE_TYPES.has(type) && !EXCLUDED_FIELDS.has(name)
  );

  return [
    ...candidates.filter(({ name }) => recommended.has(name)),
    ...candidates.filter(({ name }) => !recommended.has(name)),
  ];
};
