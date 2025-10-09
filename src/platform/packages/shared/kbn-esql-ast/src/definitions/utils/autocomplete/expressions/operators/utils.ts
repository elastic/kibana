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
import { getOperatorSuggestion } from '../../../operators';
import type { ISuggestionItem } from '../../../../../commands_registry/types';
import { logicalOperators } from '../../../../all_operators';
import type { FunctionParameterType } from '../../../../types';

export function shouldDisableAutoComma(functionName?: string): boolean {
  const isCaseFunction = functionName ? matchesSpecialFunction(functionName, 'case') : false;

  return isCaseFunction;
}

/**
 * Computes accepted types for next-argument suggestions within a function context.
 * - If the context is an unconstrained boolean condition (e.g., condition param) or
 * the signature allows an unconstrained first arg (e.g., empty param set for special syntaxes), return ['any'].
 * - Special case: For homogeneous functions where first param is boolean, suggest ['any']
 * because user can type any field and add operators to produce boolean (e.g., COALESCE(bool1, textField > "x"))
 * - Otherwise, prefer non-constant param types; fallback to all param types; final fallback ['any'].
 */
export function getAcceptedTypesForParamContext(
  paramDefinitions: Array<{ type: FunctionParameterType; constantOnly?: boolean; name?: string }>,
  options: {
    firstArgumentType?: string;
    functionSignatures?: Array<{
      params: Array<{ type: FunctionParameterType; name?: string }>;
      minParams?: number;
      returnType?: string;
    }>;
  } = {}
): ('any' | FunctionParameterType)[] {
  const nonConstantParamDefs = paramDefinitions.filter(({ constantOnly }) => !constantOnly);

  // Special case: if first parameter is boolean in homogeneous functions,
  // suggest all types (user can build boolean expressions with operators)
  // Example: COALESCE(bool1, textField▌) should suggest all fields, not just boolean
  const firstParamIsBoolean = options.firstArgumentType === 'boolean';

  if (nonConstantParamDefs.length > 0) {
    const computedTypes = ensureKeywordAndText(nonConstantParamDefs.map(({ type }) => type));

    // If parameter definition says 'any', return ['any'] directly
    // This covers CASE value parameters and other functions with flexible parameter types
    if (computedTypes.length === 1 && computedTypes[0] === 'any') {
      return ['any'];
    }

    // Detect CASE-like pattern: function with alternating boolean/any parameters
    // CASE has signatures with: params containing both 'boolean' and 'any', minParams>=2, returnType='unknown'
    // This pattern indicates all parameters accept expressions (not just simple values)
    if (options.functionSignatures) {
      const hasCasePattern = options.functionSignatures.some((sig) => {
        const hasMinParams = sig.minParams != null && sig.minParams >= 2;
        const hasUnknownReturn = sig.returnType === 'unknown';
        const hasBooleanAndAny =
          sig.params.some((p) => p.type === 'boolean') && sig.params.some((p) => p.type === 'any');

        return hasMinParams && hasUnknownReturn && hasBooleanAndAny;
      });

      if (hasCasePattern) {
        return ['any'];
      }
    }

    // Special case: boolean parameters in homogeneous functions accept any type
    // because user can build boolean expressions with operators
    if (firstParamIsBoolean && computedTypes.length === 1 && computedTypes[0] === 'boolean') {
      return ['any'];
    }

    return computedTypes;
  }

  if (paramDefinitions.length > 0) {
    return ensureKeywordAndText(paramDefinitions.map(({ type }) => type));
  }

  return ['any'];
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
