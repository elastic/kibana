/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildOuterTopNSubquery, type OuterTopNFilterInput } from './build_outer_top_n_filter';

/**
 * ES|QL literal for the Lens "Other" bucket label (matches `otherBucketLabel` default).
 * Type casts use the uppercase form `print('basic')` emits.
 */
export const OTHER_BUCKET_ESQL_LITERAL = '"Other"::KEYWORD';

export interface OuterTopNOtherRemapInput extends OuterTopNFilterInput {
  /**
   * Casts kept values to keyword for non-string fields (number, ip, …), since a `CASE`
   * cannot mix the field type with the `"Other"` keyword.
   */
  castToString?: boolean;
}

/**
 * Remaps values outside the top-N set to `"Other"` before aggregation, so Convert to ES|QL can
 * keep the remaining-values bucket that classic esaggs builds with a post-flight filters agg.
 */
export const buildOuterTopNOtherRemap = ({
  castToString = false,
  ...input
}: OuterTopNOtherRemapInput): string => {
  const { groupExpr } = input;
  const keptValue = castToString ? `TO_STRING(${groupExpr})` : groupExpr;
  return `EVAL ${groupExpr} = CASE(${groupExpr} IN (${buildOuterTopNSubquery(
    input
  )}), ${keptValue}, ${OTHER_BUCKET_ESQL_LITERAL})`;
};

/**
 * Long flag for ordering: named values are `1`, `"Other"` is `0`. Sorting this `DESC` then by
 * the chart metric keeps Other last without mixing `long` and `double` in one `CASE` (AVG/SUM
 * are double; COUNT is long — ES|QL requires CASE branches to share a type).
 */
export const buildOtherBucketNamedFlagFragment = ({
  flagAlias,
  groupExpr,
}: {
  flagAlias: string;
  groupExpr: string;
}): string => `${flagAlias} = CASE(${groupExpr} == ${OTHER_BUCKET_ESQL_LITERAL}, 0::LONG, 1::LONG)`;
