/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { matchesSpecialFunction } from '../utils';
import { ensureKeywordAndText } from '../../functions';
import { isList } from '../../../../../ast/is';
import { isMarkerNode } from '../../../ast';
import { getLastNonWhitespaceChar } from '../../helpers';
import { getOperatorSuggestion } from '../../../operators';
import type { ISuggestionItem } from '../../../../../commands_registry/types';
import { logicalOperators } from '../../../../all_operators';
import type { FunctionParameterType } from '../../../../types';

/** Returns true if the function name is CASE or the parameter */
export function hasBooleanConditionParam(
  functionName?: string,
  paramDefinitions?: Array<{ type: FunctionParameterType; name?: string }>
): boolean {
  const isCase = functionName ? matchesSpecialFunction(functionName, 'case') : false;
  const hasBooleanCondition =
    paramDefinitions?.some(({ type, name }) => type === 'boolean' && name === 'condition') ?? false;

  return isCase || hasBooleanCondition;
}

/**
 * Computes accepted types for next-argument suggestions within a function context.
 * - If the context is an unconstrained boolean condition (e.g., condition param) or
 *   the signature allows an unconstrained first arg (e.g., empty param set for special syntaxes), return ['any'].
 * - Otherwise, prefer non-constant param types; fallback to all param types; final fallback ['any'].
 */
export function getAcceptedTypesForParamContext(
  functionName: string | undefined,
  paramDefinitions: Array<{ type: FunctionParameterType; constantOnly?: boolean; name?: string }>,
  options: { isCaseWithEmptyParams?: boolean } = {}
): ('any' | FunctionParameterType)[] {
  const nonConstantParamDefs = paramDefinitions.filter(({ constantOnly }) => !constantOnly);
  const isCaseWithEmptyParams = Boolean(options.isCaseWithEmptyParams);
  const isBooleanCondition = hasBooleanConditionParam(functionName, paramDefinitions);

  if (nonConstantParamDefs.length > 0 || isCaseWithEmptyParams) {
    return isBooleanCondition || isCaseWithEmptyParams
      ? ['any']
      : ensureKeywordAndText(nonConstantParamDefs.map(({ type }) => type));
  }

  if (paramDefinitions.length > 0) {
    return ensureKeywordAndText(paramDefinitions.map(({ type }) => type));
  }

  return ['any'];
}

/** Returns true if a comma should be suggested inside the list based on current text */
export function shouldSuggestCommaInList(innerText: string, list: any): boolean {
  const hasValues = list.values && list.values.length > 0;
  const isAfterComma = getLastNonWhitespaceChar(innerText) === ',';

  return hasValues && !isAfterComma;
}

/** Returns true if we should suggest opening a list for the right operand */
export function shouldSuggestOpenListForOperand(operand: any): boolean {
  return (
    !operand ||
    isMarkerNode(operand) ||
    (isList(operand) && operand.location.min === 0 && operand.location.max === 0)
  );
}

/** Suggestions for logical continuations after a complete list or null-check operator */
export function getLogicalContinuationSuggestions(): ISuggestionItem[] {
  return logicalOperators.map(getOperatorSuggestion);
}
