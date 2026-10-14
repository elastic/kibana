/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import dateMath from '@kbn/datemath';

/**
 * Builds an Elasticsearch range query on a date field from optional datemath strings.
 * Invalid or unparseable bounds are omitted.
 */
export function buildTimeRangeFilter(
  field: 'startedAt' | 'finishedAt',
  after?: string,
  before?: string
): estypes.QueryDslQueryContainer | undefined {
  const gte = after ? dateMath.parse(after)?.toISOString() : undefined;
  const lte = before ? dateMath.parse(before, { roundUp: true })?.toISOString() : undefined;
  if (!gte && !lte) {
    return undefined;
  }
  return {
    range: {
      [field]: {
        ...(gte && { gte }),
        ...(lte && { lte }),
      },
    },
  };
}
