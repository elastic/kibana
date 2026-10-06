/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { ISuggestionItem } from '../../../../../registry/types';
export declare const LIKE_OPERATOR_REGEX: RegExp;
export declare const IS_NOT_REGEX: RegExp;
export declare const IS_NULL_OPERATOR_REGEX: RegExp;
export declare const IN_OPERATOR_REGEX: RegExp;
export declare const NOT_IN_REGEX: RegExp;
export declare function endsWithInOrNotInToken(innerText: string): boolean;
export declare function endsWithLikeOrRlikeToken(innerText: string): boolean;
export declare function endsWithIsOrIsNotToken(innerText: string): boolean;
export declare function isOperandMissing(operand: ESQLSingleAstItem | undefined): boolean;
/** Returns true when the IN-family right operand can still be started. */
export declare function shouldSuggestRightOperandStart(
  operand: ESQLSingleAstItem | undefined
): boolean;
/** Suggestions for logical continuations after a complete boolean operator expression. */
export declare function getLogicalContinuationSuggestions(): ISuggestionItem[];
