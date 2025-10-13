/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isList } from '../../../../../ast/is';
import { isMarkerNode } from '../../../ast';
import { getOperatorSuggestion } from '../../../operators';
import type { ISuggestionItem } from '../../../../../commands_registry/types';
import { logicalOperators } from '../../../../all_operators';

/** Returns true if we should suggest opening a list for the right operand */
export function shouldSuggestOpenListForOperand(operand: any): boolean {
  return (
    !operand ||
    isMarkerNode(operand) ||
    (operand?.type === 'unknown' && operand?.incomplete === true) ||
    (isList(operand) && operand.location.min === 0 && operand.location.max === 0)
  );
}

/** Suggestions for logical continuations after a complete list or null-check operator */
export function getLogicalContinuationSuggestions(): ISuggestionItem[] {
  return logicalOperators.map(getOperatorSuggestion);
}

/**
 * Detects when the current innerText ends with an IN or NOT IN token,
 * before the parser has formed the operator node in the AST.
 * Useful inside function-argument contexts (e.g., CASE(... IN ▌)).
 */
export function endsWithInOrNotInToken(innerText: string): boolean {
  return /\b(?:not\s+)?in\s*$/i.test(innerText.trimEnd());
}

/** Detects trailing LIKE/RLIKE (with optional NOT) before AST forms the operator */
export function endsWithLikeOrRlikeToken(innerText: string): boolean {
  return /\b(?:not\s+)?r?like\s*$/i.test(innerText.trimEnd());
}

/** Detects trailing IS or IS NOT (partial) before AST forms the operator */
export function endsWithIsOrIsNotToken(innerText: string): boolean {
  const text = innerText.trimEnd();
  return /\bis\s*(?:not\s*)?$/i.test(text);
}
