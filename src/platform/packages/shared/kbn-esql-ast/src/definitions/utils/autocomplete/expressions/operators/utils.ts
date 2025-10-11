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

    // Homogeneous functions (COALESCE/GREATEST/LEAST-like): from the second argument onward,
    // constrain accepted types to the first argument's type (text/keyword interchangeable).
    if (isHomogeneousFunction(options.functionSignatures)) {
      const { firstArgumentType } = options;
      if (firstArgumentType && firstArgumentType !== 'unknown') {
        // Special case: boolean homogeneity → allow any (user can build boolean via operators)
        if (
          (firstArgumentType as FunctionParameterType) === 'boolean' &&
          computedTypes.length === 1 &&
          computedTypes[0] === 'boolean'
        ) {
          return ['any'];
        }

        const isTextual = firstArgumentType === 'text' || firstArgumentType === 'keyword';
        return isTextual
          ? (['text', 'keyword'] as FunctionParameterType[])
          : ([firstArgumentType as FunctionParameterType] as FunctionParameterType[]);
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

/** Returns true if signatures indicate a homogeneous function (COALESCE/GREATEST/LEAST-like) */
export function isHomogeneousFunction(
  functionSignatures:
    | Array<{ params: Array<{ type: FunctionParameterType }>; minParams?: number }>
    | undefined
): boolean {
  if (!functionSignatures || functionSignatures.length === 0) {
    return false;
  }
  const isText = (t: FunctionParameterType) => t === 'keyword' || t === 'text';

  return functionSignatures.every((sig) => {
    const isVariadic = sig.minParams != null;

    if (!isVariadic && (!sig.params || sig.params.length < 2)) {
      return false;
    }

    const first = sig.params[0]?.type;
    if (!first || first === 'any') {
      return false;
    }

    return sig.params.every(({ type }) => type === first || (isText(first) && isText(type)));
  });
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
