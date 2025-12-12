/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isList } from '../../../../../../ast/is';
import { isMarkerNode } from '../../../ast';
import { getOperatorSuggestion } from '../../../operators';
import type { ISuggestionItem } from '../../../../../registry/types';
import type { ESQLSingleAstItem } from '../../../../../../types';
import { logicalOperators } from '../../../../all_operators';

export const LIKE_OPERATOR_REGEX = /\b(not\s+)?(r?like)\s*$/i;
export const IS_NOT_REGEX = /\bis\s+not\b/i;
export const IS_NULL_OPERATOR_REGEX =
  /\bis\s+(?:n(?:o(?:t(?:\s+n(?:u(?:l)?)?|\s*)?)?|u(?:l)?)?)?$/i;
export const IN_OPERATOR_REGEX = /\b(?:not\s+)?in\s*\(?\s*$/i;
export const NOT_IN_REGEX = /\bnot\s+in\s*$/i;

export function endsWithInOrNotInToken(innerText: string): boolean {
  return IN_OPERATOR_REGEX.test(innerText);
}

export function endsWithLikeOrRlikeToken(innerText: string): boolean {
  return LIKE_OPERATOR_REGEX.test(innerText);
}

export function endsWithIsOrIsNotToken(innerText: string): boolean {
  return IS_NULL_OPERATOR_REGEX.test(innerText);
}

export function isOperandMissing(operand: ESQLSingleAstItem | undefined): boolean {
  return (
    !operand ||
    isMarkerNode(operand) ||
    (operand?.type === 'unknown' && operand?.incomplete === true)
  );
}

/** Returns true if we should suggest opening a list for the right operand */
export function shouldSuggestOpenListForOperand(operand: ESQLSingleAstItem | undefined): boolean {
  return (
    isOperandMissing(operand) ||
    (isList(operand) && operand.location.min === 0 && operand.location.max === 0)
  );
}

/** Suggestions for logical continuations after a complete list or null-check operator */
export function getLogicalContinuationSuggestions(): ISuggestionItem[] {
  return logicalOperators.map(getOperatorSuggestion);
}
