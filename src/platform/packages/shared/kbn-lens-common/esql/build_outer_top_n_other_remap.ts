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
  keyAlias: string;
}

/**
 * Keeps top-N values in a key column with the field's own type and nulls the rest, so Convert to
 * ES|QL can rebuild the remaining-values bucket that classic esaggs builds with a post-flight
 * filters agg. Grouping and sorting on the typed key keep DSL key order for number, ip and
 * version fields; the `"Other"` label is only applied to the output rows.
 */
export const buildOuterTopNOtherRemap = ({
  keyAlias,
  ...input
}: OuterTopNOtherRemapInput): string => {
  const { groupExpr } = input;
  return `EVAL ${keyAlias} = CASE(${groupExpr} IN (${buildOuterTopNSubquery(
    input
  )}), ${groupExpr}, NULL)`;
};

/**
 * Long flag for ordering: named values are `1`, Other (null key) is `0`. Sorting this `DESC`
 * then by the chart metric keeps Other last without mixing `long` and `double` in one `CASE`.
 */
export const buildOtherBucketNamedFlagFragment = ({
  flagAlias,
  keyAlias,
}: {
  flagAlias: string;
  keyAlias: string;
}): string => `${flagAlias} = CASE(${keyAlias} IS NULL, 0::LONG, 1::LONG)`;

/** Restores the field column as keyword labels, with `"Other"` for the null key. */
export const buildOtherBucketLabelFragment = ({
  groupExpr,
  keyAlias,
}: {
  groupExpr: string;
  keyAlias: string;
}): string => `${groupExpr} = COALESCE(TO_STRING(${keyAlias}), ${OTHER_BUCKET_ESQL_LITERAL})`;
