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
 * Stable, serializable identifier for a metric item, robust enough to survive
 * grid reorders / pagination / re-fetch so can be restored across
 * navigation and tab duplication.
 */
export const getMetricUniqueKey = (metricItem: ParsedMetricItem): string =>
  `${metricItem.dataStream}::${metricItem.metricName}`;
