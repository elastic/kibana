/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldDescriptor } from '@kbn/data-views-plugin/server';

/**
 * Field types that never resolve to a scalar leaf value via the dot-path
 * traversal used when snapshotting a single alert document, so they must be
 * excluded from consumers that can only reason about scalar leaves (e.g. the
 * `field_change` snooze condition).
 */
const NON_SCALAR_FIELD_TYPES = new Set(['object', 'nested']);

/**
 * Reduces the alert index fields down to the leaf-level scalar field names.
 * Object/nested containers and nested-object leaves are excluded because their
 * dot-path snapshot resolves to `null` (see issue #275054). Names are
 * de-duplicated and sorted alphabetically.
 */
export const toLeafScalarFieldNames = (fields: FieldDescriptor[]): string[] => {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const field of fields) {
    if (!field?.name) continue;
    if (NON_SCALAR_FIELD_TYPES.has(field.type)) continue;
    if (field.subType?.nested) continue;
    if (seen.has(field.name)) continue;

    seen.add(field.name);
    names.push(field.name);
  }

  return names.sort((a, b) => a.localeCompare(b));
};
