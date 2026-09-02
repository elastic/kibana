/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isBinaryExpression,
  isFunctionExpression,
  isList,
  isLiteral,
  isUnaryExpression,
} from '@elastic/esql';
import type { ESQLAstItem, ESQLFunction, ESQLList, ESQLSingleAstItem } from '@elastic/esql/types';
import { nullCheckOperators, inOperators } from '../../../all_operators';
import type {
  ExpressionContext,
  FunctionParameterContext,
  ParenthesizedExpressionPosition,
} from './types';
import type { ICommandContext, ISuggestionItem } from '../../../../registry/types';
import { getFunctionDefinition } from '../../functions';
import { getBinaryExpressionOperand, resolveArgumentTypes } from '../../expressions';
import type { SupportedDataType } from '../../../types';
import {
  getMatchingSignatures,
  getMaxMinNumberOfParams,
  getParamAtPosition,
  getParamDefsAtPosition,
} from '../../signatures';
import type { PreferredExpressionType } from './types';

export type SpecialFunctionName = 'case' | 'count' | 'bucket';
export type IncompleteOperatorReason = 'tooFewArgs' | 'wrongTypes';

export const isTupleExpression = (
  expression: ESQLSingleAstItem | undefined
): expression is ESQLList =>
  Boolean(expression && isList(expression) && expression.subtype === 'tuple');

/** Checks whether the source text wraps an AST expression in closed parentheses. */
export const isExpressionParenthesized = (
  innerText: string,
  expressionRoot?: ESQLSingleAstItem
): boolean => {
  if (!expressionRoot) {
    return false;
  }

  const beforeExpression = innerText.slice(0, expressionRoot.location.min).trimEnd();
  const afterExpression = innerText.slice(expressionRoot.location.max + 1).trimStart();

  return beforeExpression.endsWith('(') && afterExpression.startsWith(')');
};

/** Returns the cursor position relative to parentheses wrapping the expression. */
export const getParenthesizedExpressionPosition = (
  query: string,
  innerText: string,
  expressionRoot?: ESQLSingleAstItem
): ParenthesizedExpressionPosition | undefined => {
  if (!isExpressionParenthesized(query, expressionRoot)) {
    return;
  }

  return isExpressionParenthesized(innerText, expressionRoot) ? 'after' : 'inside';
};

/** IN, NOT IN, IS NULL, IS NOT NULL operators requiring special autocomplete handling */
export const specialOperators = [...inOperators, ...nullCheckOperators];

/** Returns the deepest function expression along the rightmost binary or prefix-unary path. */
export function getRightmostOperator(expression: ESQLFunction): ESQLFunction {
  let operator = expression;

  while (isBinaryExpression(operator) || isUnaryExpression(operator)) {
    const rightOperand = isBinaryExpression(operator) ? operator.args[1] : operator.args[0];

    if (!isFunctionExpression(rightOperand)) {
      break;
    }

    operator = rightOperand;
  }

  return operator;
}

/** Checks if operator is a NULL check (IS NULL, IS NOT NULL) */
export function isNullCheckOperator(name: string) {
  const upperName = name.toUpperCase();

  return nullCheckOperators.some((op) => op.name.toUpperCase() === upperName);
}

/** Checks if operator is IN or NOT IN */
export function isInOperator(name: string) {
  const lowerName = name.toLowerCase();

  return inOperators.some((operator) => operator.name.toLowerCase() === lowerName);
}

/** Checks if operator requires special handling */
export function isSpecialOperator(name: string) {
  const lowerName = name.toLowerCase();

  return specialOperators.some((op) => op.name.toLowerCase() === lowerName);
}

/** Checks if function name matches a special function (case-insensitive) */
export function matchesSpecialFunction(name: string, expected: SpecialFunctionName) {
  return name.toLowerCase() === expected;
}

/**
 *   Builds function parameter context for suggestions
 *   Commands with special filtering (like STATS) can extend with command-specific functionsToIgnore
 */
export function buildExpressionFunctionParameterContext(
  fn: ESQLFunction,
  context?: ICommandContext,
  shouldGetNextArgument = false
): FunctionParameterContext | null {
  const fnDefinition = getFunctionDefinition(fn.name);

  if (!fnDefinition || !context) {
    return null;
  }

  const { argTypes, literalMask } = resolveArgumentTypes(fn.args, {
    columns: context?.columns,
    unmappedFieldsStrategy: context?.unmappedFieldsStrategy,
  });

  let argIndex = Math.max(fn.args.length, 0);
  if (!shouldGetNextArgument && argIndex) {
    argIndex -= 1;
  }

  const isVariadicFn = fnDefinition.signatures.some((sig) => sig.minParams != null);
  const hasMultipleSignatures = fnDefinition.signatures.length > 1;
  const argsToCheckForFiltering =
    isVariadicFn || shouldGetNextArgument || !hasMultipleSignatures ? argIndex : fn.args.length;

  const validSignatures = getMatchingSignatures(
    fnDefinition.signatures,
    argTypes.slice(0, argsToCheckForFiltering),
    literalMask.slice(0, argsToCheckForFiltering),
    true,
    true
  );

  const compatibleParamDefs = getParamDefsAtPosition(
    getMatchingSignatures(
      fnDefinition.signatures,
      argTypes.slice(0, argIndex),
      literalMask.slice(0, argIndex),
      true,
      true
    ),
    argIndex
  );

  const hasMoreMandatoryArgs = !validSignatures.some((signature) => {
    const nextParam = getParamAtPosition(signature, argIndex + 1);

    return nextParam === null || nextParam?.optional === true;
  });

  const firstArgumentType = argTypes[0];
  const hasRepeating = fnDefinition.signatures.some((sig) => sig.isSignatureRepeating);
  const firstValueType = hasRepeating ? argTypes[1] : undefined;

  const signatures = validSignatures.length ? validSignatures : fnDefinition.signatures;

  return {
    signatures,
    paramDefinitions: compatibleParamDefs,
    hasMoreMandatoryArgs,
    functionDefinition: fnDefinition,
    firstArgumentType,
    firstValueType,
    currentParameterIndex: argIndex,
    validSignatures,
  };
}

/** Removes a partially typed unknown identifier from an operator's arguments. */
export function removeFinalUnknownIdentiferArg(
  args: ESQLAstItem[],
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'
): ESQLAstItem[] {
  return getExpressionType(args[args.length - 1]) === 'unknown'
    ? args.slice(0, args.length - 1)
    : args;
}

/**
 * Explains why an operator invocation is not yet complete for autocomplete purposes.
 */
export function getIncompleteOperatorReason(
  operator: ESQLFunction,
  getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'
): IncompleteOperatorReason | undefined {
  const fnDefinition = getFunctionDefinition(operator.name);

  if (!fnDefinition) {
    return 'tooFewArgs';
  }

  // We need this flag because subquery pipeline types are unknown even when the operator type is known.
  const hasResolvedType = getExpressionType(operator) !== 'unknown';
  const argsForArityCheck = hasResolvedType
    ? operator.args
    : removeFinalUnknownIdentiferArg(operator.args, getExpressionType);
  const { min, max } = getMaxMinNumberOfParams(fnDefinition.signatures);
  const hasValidArity = argsForArityCheck.length >= min && argsForArityCheck.length <= max;

  if (!hasValidArity) {
    return 'tooFewArgs';
  }

  if (operator.incomplete && isNullCheckOperator(fnDefinition.name)) {
    return 'tooFewArgs';
  }

  const rightOperand = getBinaryExpressionOperand(operator, 'right');

  if (isInOperator(fnDefinition.name) && Array.isArray(rightOperand) && !rightOperand.length) {
    return 'tooFewArgs';
  }

  const givenTypes = operator.args.map((arg) => getExpressionType(arg));
  const literalMask = operator.args.map((arg) => isLiteral(Array.isArray(arg) ? arg[0] : arg));
  const hasCorrectTypes =
    getMatchingSignatures(fnDefinition.signatures, givenTypes, literalMask, true).length > 0;

  if (!hasCorrectTypes) {
    return 'wrongTypes';
  }

  return undefined;
}

/**
 * Tries to get KQL suggestions if the cursor is inside a KQL function string parameter.
 *
 * Detects patterns like:
 * - KQL("""query here...""")
 *
 * Returns null if not inside a KQL function string, allowing normal suggestion flow.
 */
export async function getKqlSuggestionsIfApplicable(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const { innerText, callbacks } = ctx;

  const getKqlSuggestions = callbacks?.getKqlSuggestions;

  if (!getKqlSuggestions) {
    return null;
  }

  // Check if we're inside a KQL function call with triple quotes
  const kqlMatch = innerText.match(/\bkql\s*\(\s*"""([\s\S]*)$/i);

  if (!kqlMatch) {
    return null;
  }

  const kqlQuery = kqlMatch[1];
  const cursorPositionInKql = kqlQuery.length;

  try {
    const suggestions = await getKqlSuggestions(kqlQuery, cursorPositionInKql);

    if (!suggestions || suggestions.length === 0) {
      return null;
    }

    const startOffset = innerText.length - kqlQuery.length;

    return suggestions.map(({ range, ...suggestion }) => ({
      ...suggestion,
      // Exception to the standard attachReplacementRanges path (no strategy / prefix resolver):
      // KQL provider already owns the replace range; we shift to ES|QL coords — lexer sees """…""" as one token.
      rangeToReplace: {
        start: startOffset + range.start,
        end: startOffset + range.end,
      },
    }));
  } catch (error) {
    return null;
  }
}

/** Normalizes preferred expression type option into an array form for downstream checks. */
export function normalizePreferredExpressionTypes(
  preferredExpressionType?: PreferredExpressionType | PreferredExpressionType[]
): PreferredExpressionType[] {
  if (!preferredExpressionType) {
    return [];
  }

  return Array.isArray(preferredExpressionType)
    ? preferredExpressionType
    : [preferredExpressionType];
}
