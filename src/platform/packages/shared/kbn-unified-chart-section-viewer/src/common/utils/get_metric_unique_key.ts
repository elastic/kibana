/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParsedMetricItem } from '../../types';

/**
 * Stable, opaque identifier for a metric item, used to restore selection
 * across grid reorders, pagination, re-fetch, and tab duplication.
 *
 * Safe collision-wise: the key is compared by equality, never split. ES
 * forbids `:` in source names (index and data stream names alike), so the
 * first `::` is always the delimiter and the encoding stays injective even if
 * `metricName` contains `::`.
 */
export const getMetricUniqueKey = (metricItem: ParsedMetricItem): string =>
  `${metricItem.indexName}::${metricItem.metricName}`;
