/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFunction } from '@elastic/esql/types';
import { nullCheckOperators, inOperators } from '../../../all_operators';
import type { ExpressionContext, FunctionParameterContext } from './types';
import type { ICommandContext, ISuggestionItem } from '../../../../registry/types';
import { getFunctionDefinition } from '../..';
import { resolveSignatureContext } from './signature_analyzer';
import type { PreferredExpressionType } from './types';

export type SpecialFunctionName = 'case' | 'count' | 'bucket';

/** IN, NOT IN, IS NULL, IS NOT NULL operators requiring special autocomplete handling */
export const specialOperators = [...inOperators, ...nullCheckOperators];

/** Checks if operator is a NULL check (IS NULL, IS NOT NULL) */
export function isNullCheckOperator(name: string) {
  const upperName = name.toUpperCase();

  return nullCheckOperators.some((op) => op.name.toUpperCase() === upperName);
}

/** Checks if operator is IN or NOT IN */
export function isInOperator(name: string) {
  const lowerName = name.toLowerCase();

  return lowerName === 'in' || lowerName === 'not in';
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
  context?: ICommandContext
): FunctionParameterContext | null {
  const fnDefinition = getFunctionDefinition(fn.name);

  if (!fnDefinition || !context) {
    return null;
  }

  return resolveSignatureContext(fn, context, fnDefinition);
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
    // Get KQL suggestions from the autocomplete service
    const suggestions = await getKqlSuggestions(kqlQuery, cursorPositionInKql);

    if (!suggestions || suggestions.length === 0) {
      return null;
    }

    return suggestions;
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
