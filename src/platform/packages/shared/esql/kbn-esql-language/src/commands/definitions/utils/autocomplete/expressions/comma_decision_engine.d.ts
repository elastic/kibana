/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedDataType } from '../../../types';
import type { FunctionDefinitionTypes } from '../../../types';
export interface CommaContext {
  /** Determines which strategy handler to use */
  position: 'after_complete' | 'empty_expression' | 'enum_value' | 'inside_list';
  /** Common fields across all positions */
  hasMoreMandatoryArgs?: boolean;
  functionType?: FunctionDefinitionTypes;
  isCursorFollowedByComma?: boolean;
  /** True if position is ambiguous in repeating signature (positions 2, 4, 6...) */
  isAmbiguousPosition?: boolean;
  /** True if function accepts arbitrary expressions (e.g. CASE) */
  isExpressionHeavy?: boolean;
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
export declare function shouldSuggestComma(context: CommaContext): boolean;
