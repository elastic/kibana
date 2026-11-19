/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricUnit, NullableMetricUnit } from '../../../types';
import { normalizeUnit } from './normalize_unit';

/**
 * Resolves the unit for a metric by normalizing and selecting the best option.
 * Normalizes raw units (e.g., 'byte' -> 'bytes') and handles multiple units.
 */
export const resolveMetricUnit = (
  metricName: string,
  units: NullableMetricUnit[]
): MetricUnit | undefined => {
  for (const unit of units) {
    if (unit == null) continue;
    const normalized = normalizeUnit({ fieldName: metricName, unit });
    if (normalized != null) return normalized;
  }
  return undefined;
};
