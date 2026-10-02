/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TermsIndexPatternColumn } from '../datasources/operations';
import type { EsqlConversionFailureReason } from './to_esql_failure_reasons';

/**
 * `LIMIT n BY <outer>` expresses a single nesting level, so each extra Top values
 * dimension beyond the outer/inner pair would need its own filtering stage.
 */
const MAX_SUPPORTED_TERMS_BUCKETS = 2;

export interface TermsConversionContext {
  hasDateHistogram: boolean;
  /** Number of terms buckets on the layer, including this column. */
  termsBucketCount: number;
}

/**
 * Returns the highest-priority conversion failure reason for a terms dimension,
 * or `undefined` when the column is eligible. Check order:
 * 1. Other bucket (default-on; also covers missing values — the UI only enables
 *    "Include documents without the selected field" when Other is on, and
 *    toEsAggsFn forces missingBucket = otherBucket && missingBucket)
 * 2. Date histogram / time series
 * 3. More than two Top values dimensions
 * 4. Multiple fields on one Top values dimension
 * 5. Include / exclude filters
 * 6. Accuracy mode
 * 7. Unsupported ranking (custom, then rarity / significance)
 *
 * Callers may combine eligible terms with other convertible categorical
 * buckets via `LIMIT n BY` (non-time-series). Date histogram remains unsupported.
 *
 * All blockers are evaluated so the priority list stays authoritative, but only
 * the first reason is returned — Convert tooltips show a single reason for now.
 */
export const getTermsConversionFailure = (
  { params }: TermsIndexPatternColumn,
  { hasDateHistogram, termsBucketCount }: TermsConversionContext
): EsqlConversionFailureReason | undefined => {
  const reasons: EsqlConversionFailureReason[] = [];

  // unset/false = Other off (UI / toEsAggsFn Boolean).
  if (params.otherBucket === true) {
    reasons.push('terms_other_bucket_not_supported');
  }

  if (hasDateHistogram) {
    reasons.push('terms_date_histogram_not_supported');
  }

  if (termsBucketCount > MAX_SUPPORTED_TERMS_BUCKETS) {
    reasons.push('terms_multi_level_not_supported');
  }

  if ((params.secondaryFields?.length ?? 0) > 0) {
    reasons.push('terms_multiple_fields_not_supported');
  }

  if ((params.include?.length ?? 0) > 0 || (params.exclude?.length ?? 0) > 0) {
    reasons.push('terms_include_exclude_not_supported');
  }

  if (params.accuracyMode === true) {
    reasons.push('terms_accuracy_mode_not_supported');
  }

  if (params.orderBy.type === 'custom') {
    reasons.push('terms_custom_order_by_not_supported');
  } else if (params.orderBy.type === 'rare' || params.orderBy.type === 'significant') {
    reasons.push('terms_order_by_not_supported');
  }

  // Keep evaluating every gate above for a stable priority order, but surface
  // only the highest-priority blocker until multi-reason tooltips are enabled.
  return reasons[0];
};
