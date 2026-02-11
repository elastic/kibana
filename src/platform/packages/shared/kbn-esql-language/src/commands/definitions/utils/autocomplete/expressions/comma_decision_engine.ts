/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedDataType, Signature } from '../../../types';
import { FunctionDefinitionTypes } from '../../../types';
import { acceptsArbitraryExpressions } from './utils';

export interface CommaContext {
  /** Determines which strategy handler to use */
  position: 'after_complete' | 'empty_expression' | 'enum_value' | 'inside_list';

  /** Common fields across all positions */
  hasMoreMandatoryArgs?: boolean;
  functionType?: FunctionDefinitionTypes;
  isCursorFollowedByComma?: boolean;
  /** True if position is ambiguous in repeating signature (positions 2, 4, 6...) */
  isAmbiguousPosition?: boolean;
  functionSignatures?: Array<{
    params: Array<{ type: SupportedDataType | 'any' | 'unknown'; name?: string }>;
    minParams?: number;
    returnType?: string;
  }>;

  /** Position-specific fields for 'after_complete' */
  typeMatches?: boolean;
  isLiteral?: boolean;
  hasMoreParams?: boolean;
  isVariadic?: boolean;
  /** Type of the current expression (used to distinguish condition vs value in CASE) */
  expressionType?: SupportedDataType | 'unknown';
  innerText?: string;
  listHasValues?: boolean;
}

type PositionHandler = (context: CommaContext, isExpressionHeavy: boolean) => boolean;

const positionHandlers: Record<string, PositionHandler> = {
  after_complete: handleAfterComplete,
  empty_expression: handleEmptyOrEnumExpression,
  enum_value: handleEmptyOrEnumExpression,
  inside_list: handleInsideList,
};

export function shouldSuggestComma(context: CommaContext): boolean {
  const { position, isCursorFollowedByComma = false } = context;

  // Never suggest comma if cursor is already followed by one
  if (isCursorFollowedByComma) {
    return false;
  }

  const isExpressionHeavyFunction = hasExpressionHeavyParameters(context.functionSignatures);
  const handler = positionHandlers[position];
  if (!handler) {
    return false;
  }

  return handler(context, isExpressionHeavyFunction);
}

function handleAfterComplete(context: CommaContext, isExpressionHeavy: boolean): boolean {
  const { typeMatches, hasMoreParams, isVariadic, isAmbiguousPosition, expressionType } = context;

  // Repeating signatures (eg. CASE): positions 2, 4, 6... are ambiguous
  // - If expression is boolean → it's a condition → suggest comma for next value
  // - If expression is NOT boolean → could be default value → no comma
  if (isAmbiguousPosition && expressionType !== 'boolean') {
    return false;
  }

  if (!hasMoreParams) {
    return false;
  }

  if (isExpressionHeavy && !typeMatches) {
    return false;
  }

  if (!typeMatches && !isVariadic) {
    return false;
  }

  return true;
}

function handleEmptyOrEnumExpression(context: CommaContext, isExpressionHeavy: boolean): boolean {
  const { hasMoreMandatoryArgs = false, functionType } = context;

  // No more mandatory args: no comma
  if (!hasMoreMandatoryArgs) {
    return false;
  }

  // Operators don't get commas
  if (functionType === FunctionDefinitionTypes.OPERATOR) {
    return false;
  }

  // Expression-heavy functions (e.g., CASE): no auto-comma
  // User will add operators/expressions before moving to next param
  if (isExpressionHeavy) {
    return false;
  }

  return true;
}

function handleInsideList(context: CommaContext): boolean {
  const { listHasValues = false, innerText = '' } = context;

  // No values in list yet: no comma
  if (!listHasValues) {
    return false;
  }

  // Already after comma: no comma
  const lastChar = innerText.trimEnd().slice(-1);
  if (lastChar === ',') {
    return false;
  }

  return true;
}

function hasExpressionHeavyParameters(
  signatures?: Array<{
    params: Array<{ type: SupportedDataType | 'any' | 'unknown'; name?: string }>;
    minParams?: number;
    returnType?: string;
  }>
): boolean {
  if (!signatures || signatures.length === 0) {
    return false;
  }

  // Pattern: boolean + any params, minParams >= 2, returnType = unknown
  // Example: CASE function accepts expressions in all parameters
  return acceptsArbitraryExpressions(signatures as Signature[]);
}
