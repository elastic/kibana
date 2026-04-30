/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsESQLResponse } from '../../../../types';
import { toArray } from './to_array';

export const getMetricNameOccurrences = (response: MetricsESQLResponse[]): Map<string, number> => {
  const occurrences = new Map<string, number>();
  for (const metric of response) {
    const dataStreamCount = toArray(metric.data_stream).length;
    occurrences.set(
      metric.metric_name,
      (occurrences.get(metric.metric_name) ?? 0) + dataStreamCount
    );
  }
  return occurrences;
};
