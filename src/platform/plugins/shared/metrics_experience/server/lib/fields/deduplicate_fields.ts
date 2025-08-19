/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricField } from '../../../common/fields/types';

export function deduplicateFields(fields: MetricField[]): MetricField[] {
  const map = new Map<string, MetricField>();

  for (const field of fields) {
    const base = field.name.startsWith('metrics.') ? field.name.slice(8) : field.name;

    if (!map.has(base) || !field.name.startsWith('metrics.')) {
      map.set(base, { ...field, name: base });
    }
  }

  return Array.from(map.values());
}
