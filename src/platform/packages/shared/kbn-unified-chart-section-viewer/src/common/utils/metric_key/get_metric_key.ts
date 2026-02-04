/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricField } from '../../../types';

/**
 * Generates a unique key for a MetricField.
 * Format: dataViewIndex::metricName
 *
 * This combination is unique because:
 * - Field names are unique within a data view (Elasticsearch guarantees this)
 * - The dataViewIndex differentiates metrics with the same name from different data views
 *
 * @param dataViewIndex - The data view index pattern (e.g., "metrics-*")
 * @param metricName - The field name (e.g., "system.cpu.user.pct")
 * @returns A unique string key in the format "dataViewIndex::metricName"
 */
export const getMetricKey = (dataViewIndex: string, metricName: string): string => {
  return `${dataViewIndex}::${metricName}`;
};

/**
 * Creates a Map for O(1) metric lookup by key.
 *
 * @param fields - Array of MetricField objects
 * @returns A Map where keys are metric keys and values are MetricField objects
 */
export const createMetricFieldsMap = (fields: MetricField[]): Map<string, MetricField> => {
  return new Map(fields.map((f) => [getMetricKey(f.index, f.name), f]));
};
