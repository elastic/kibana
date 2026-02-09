/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const hasValue = (value: unknown): boolean => {
  if (value == null || value === '' || Number.isNaN(value)) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((v) => v != null && v !== '' && !Number.isNaN(v));
  }
  return true;
};

/**
 * Generates a unique key for a MetricField.
 * Format: index::metricName
 *
 * This combination is unique because:
 * - Field names are unique within a data view (Elasticsearch guarantees this)
 * - The index differentiates metrics with the same name from different data views
 *
 * @param index - The data view index pattern (e.g., "metrics-*")
 * @param metricName - The field name (e.g., "system.cpu.user.pct")
 * @returns A unique string key in the format "index::metricName"
 */
export const getMetricKey = (index: string, metricName: string): string => {
  return `${index}::${metricName}`;
};
