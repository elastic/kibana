/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../registry/types';
import type { ExpressionContext } from '../types';
/** Handles IN and NOT IN operators with list syntax or subquery syntax. */
export declare function handleListOperator(ctx: ExpressionContext): Promise<ISuggestionItem[]>;
/** Handles NULL-check operators (IS NULL, IS NOT NULL) */
export declare function handleNullCheckOperator(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null>;
/** Handles string pattern operators with list syntax (e.g., field LIKE ("*pattern*", "*other*")) */
export declare function handleStringListOperator(
  context: ExpressionContext
): Promise<ISuggestionItem[] | null>;
/** Handles the match operator (:) whose right operand accepts only constant values */
export declare function handleMatchOperator(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null>;
