/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { FieldDefinition } from '@kbn/content-list-provider';
import type { IndexHealth } from '../resource_stats';

export const HEALTH_FILTER_FIELD = 'health';

const HEALTH_VALUES = ['red', 'yellow', 'green'] as const;

export const healthLabels: Record<IndexHealth, string> = {
  green: i18n.translate('management.dataManagementOverview.v2.stats.health.green', {
    defaultMessage: 'Green',
  }),
  yellow: i18n.translate('management.dataManagementOverview.v2.stats.health.yellow', {
    defaultMessage: 'Yellow',
  }),
  red: i18n.translate('management.dataManagementOverview.v2.stats.health.red', {
    defaultMessage: 'Red',
  }),
};

export const healthColors: Record<IndexHealth, 'success' | 'warning' | 'danger'> = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
};

export const isIndexHealth = (value: string): value is IndexHealth =>
  (HEALTH_VALUES as readonly string[]).includes(value);

const readStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/** Health ids currently included or excluded by the table query. */
export const readHealthFilter = (filters: {
  readonly [key: string]: unknown;
}): { include: IndexHealth[]; exclude: IndexHealth[] } => {
  const value = filters[HEALTH_FILTER_FIELD];
  if (value == null || typeof value !== 'object') {
    return { include: [], exclude: [] };
  }
  const record = value as { include?: unknown; exclude?: unknown };
  return {
    include: readStrings(record.include).filter(isIndexHealth),
    exclude: readStrings(record.exclude).filter(isIndexHealth),
  };
};

/** Whether a resource row matches the active health filter. Rows without health never match an include. */
export const matchesHealthFilter = (
  health: IndexHealth | undefined,
  filter: { include: readonly string[]; exclude: readonly string[] }
): boolean => {
  if (filter.include.length > 0 && (!health || !filter.include.includes(health))) {
    return false;
  }
  return !(health && filter.exclude.includes(health));
};

export const healthFieldDefinition: FieldDefinition = {
  fieldName: HEALTH_FILTER_FIELD,
  resolveIdToDisplay: (id) => (isIndexHealth(id) ? healthLabels[id] : id),
  resolveDisplayToId: (displayValue) => {
    const normalized = displayValue.trim().toLowerCase();
    return HEALTH_VALUES.find(
      (health) => health === normalized || healthLabels[health].toLowerCase() === normalized
    );
  },
};
