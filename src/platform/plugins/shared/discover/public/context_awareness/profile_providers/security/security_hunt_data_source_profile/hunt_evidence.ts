/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { Filter } from '@kbn/es-query';
import type { HuntEvidenceSelection } from '@kbn/discover-shared-plugin/public';

type Scalar = string | number | boolean | null;

/** Longest string a stored value may hold; the server enforces the same limit. */
const MAX_STORED_STRING = 1024;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const toScalar = (value: unknown): Scalar => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.slice(0, MAX_STORED_STRING);
};

/**
 * What the server needs to preserve a selected row. An event is sent as a reference (index and id)
 * and re-read on the server; an aggregate row is sent as its displayed values. Events from an ES|QL
 * query carry `_index` and `_id` as columns; those from a data view carry them on the raw hit.
 */
export const toEvidenceSelection = (
  record: DataTableRecord,
  resultKind: 'raw_event' | 'aggregate'
): HuntEvidenceSelection | undefined => {
  if (resultKind === 'raw_event') {
    const index = asString(record.flattened._index) ?? asString(record.raw._index);
    const id = asString(record.flattened._id) ?? asString(record.raw._id);
    return index && id ? { kind: 'raw_event', index, id } : undefined;
  }

  return {
    kind: 'aggregate',
    values: Object.fromEntries(
      Object.entries(record.flattened).map(([field, value]) => [field, toScalar(value)])
    ),
  };
};

/**
 * Stores each filter as its JSON when it fits, so a resumed hunt can restore it. A filter too large to
 * keep whole is stored as a summary that is shown but not restored.
 */
export const toStoredFilters = (filters: Filter[]): Array<Record<string, Scalar>> =>
  filters.map((filter): Record<string, Scalar> => {
    const json = JSON.stringify(filter);
    if (json.length <= MAX_STORED_STRING) return { json };
    return {
      key: filter.meta?.key ?? '',
      type: filter.meta?.type ?? '',
      negate: Boolean(filter.meta?.negate),
      disabled: Boolean(filter.meta?.disabled),
    };
  });
