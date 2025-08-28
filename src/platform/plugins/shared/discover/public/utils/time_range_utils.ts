/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/data-plugin/common';

/**
 * Calculates the query time range in seconds from a TimeRange object
 * @param timeRange The time range object with from/to ISO strings
 * @returns The time range duration in seconds
 */
export function calculateQueryRangeSeconds(timeRange: TimeRange): number {
  const fromTime = new Date(timeRange.from).getTime();
  const toTime = new Date(timeRange.to).getTime();
  return Math.round((toTime - fromTime) / 1000);
}
