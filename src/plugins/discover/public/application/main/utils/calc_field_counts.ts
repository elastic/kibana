/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/public';
import { flattenHit } from '@kbn/data-plugin/public';
import { ElasticSearchHit } from '../../../types';

/**
 * This function is calculating stats of the available fields, for usage in sidebar and sharing
 * Note that this values aren't displayed, but used for internal calculations
 */
export function calcFieldCounts(rows?: ElasticSearchHit[], indexPattern?: DataView) {
  const counts: Record<string, number> = {};
  if (!rows || !indexPattern) {
    return {};
  }
  for (const hit of rows) {
    const fields = Object.keys(flattenHit(hit, indexPattern, { includeIgnoredValues: true }));
    for (const fieldName of fields) {
      counts[fieldName] = (counts[fieldName] || 0) + 1;
    }
  }

  return counts;
}
