/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CallSiteId, ExpressionPart } from './types';

/**
 * What each place inside an expression is, by its call site. An expression is the same in
 * every command, so its places are described here once and not per command.
 */
export const EXPRESSION_PARTS: Readonly<Record<CallSiteId, ExpressionPart>> = {
  'primaryExpression>qualifiedName': { part: 'column' },
  'primaryExpression>constant': { part: 'literal' },
  'functionExpression>functionName': { part: 'function_name' },
  // The type of a cast, as `keyword` in `a::keyword`.
  'dataType>identifier': { part: 'data_type' },
  // The named parameters of a function, as `{"fuzziness": 2}` in MATCH.
  'entryExpression.key': { part: 'map_key' },
  'mapValue>constant': { part: 'map_value' },
  // The right side of the match operator, `field : "query"`.
  'matchBooleanExpression.matchQuery': { part: 'match_query' },
  // The pattern of LIKE and RLIKE.
  'stringOrParameter>string': { part: 'pattern' },
  'stringOrParameter>parameter': { part: 'pattern' },
  // `v` in `v -> v > 1`: a name that exists only in the body of its lambda.
  'lambda>identifier': {
    part: 'new_name',
    of: 'lambda_parameter',
    scope: 'functionExpression>lambda',
  },
};

/** The place of a function call in an expression: its name and its arguments in brackets. */
export const FUNCTION_CALL: CallSiteId = 'primaryExpression>functionExpression';
