/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParsedMetricItem } from '../../types';
import { getMetricUniqueKey } from './get_metric_unique_key';

/**
 * Keeps capable metrics that also appear in the membership (has-data) set.
 * Order follows `capable`. Identity is `indexName::metricName`.
 */
export function keepMetricsPresentInBoth(
  capable: ParsedMetricItem[],
  withData: ReadonlyArray<Pick<ParsedMetricItem, 'indexName' | 'metricName'>>
): ParsedMetricItem[] {
  const withDataKeys = new Set(withData.map(getMetricUniqueKey));
  return capable.filter((item) => withDataKeys.has(getMetricUniqueKey(item)));
}
