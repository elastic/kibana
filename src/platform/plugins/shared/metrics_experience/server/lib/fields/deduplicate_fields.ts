/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricField } from '../../../common/types';
import { generateMapKey } from './enrich_metric_fields';

const BASE_FIELD_NAME = 'metrics.';
export function deduplicateFields(fields: MetricField[]): MetricField[] {
  const map = new Map<string, MetricField>();

  for (const field of fields) {
    const isMetricsPrefixed = field.name.startsWith(BASE_FIELD_NAME);
    const base = isMetricsPrefixed ? field.name.slice(BASE_FIELD_NAME.length) : field.name;

    if (!map.has(base) || !isMetricsPrefixed) {
      map.set(generateMapKey(field.index, base), { ...field, name: base });
    }
  }

  return Array.from(map.values());
}
