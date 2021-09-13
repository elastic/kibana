/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexPattern } from 'src/plugins/data/common';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';

/**
 * This function is recording stats of the available fields, for usage in sidebar and sharing
 * Note that this values aren't displayed, but used for internal calculations
 */
export function calcFieldCounts(
  counts = {} as Record<string, number>,
  rows?: ElasticSearchHit[],
  indexPattern?: IndexPattern
) {
  if (!rows || !indexPattern) {
    return {};
  }
  for (const hit of rows) {
    const fields = Object.keys(indexPattern.flattenHit(hit));
    for (const fieldName of fields) {
      counts[fieldName] = (counts[fieldName] || 0) + 1;
    }
  }

  return counts;
}
