/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExpressionType, getFunctionDefinition } from '../..';
import { isFunctionExpression } from '../../../../../ast/is';
import { within } from '../../../../../ast/location';
import type { ISuggestionItem } from '../../../../registry/types';
import { inOperators, nullCheckOperators, patternMatchOperators } from '../../../all_operators';
import { isExpressionComplete } from '../../expressions';
import { getOverlapRange } from '../../shared';
import { dispatchPartialOperators } from './operators/partial/dispatcher';
import { detectIn, detectLike, detectNullCheck } from './operators/partial/utils';
import { getPosition, type ExpressionPosition } from './position';
import { dispatchStates } from './positions/dispatcher';
import {
  DOUBLE_QUOTED_STRING_REGEX,
  getCommandMapExpressionSuggestions,
  isInsideMapExpression,
} from '../map_expression';
import { SignatureAnalyzer } from './signature_analyzer';
import type {
  ExpressionComputedMetadata,
  ExpressionContext,
  ExpressionContextOptions,
  SuggestForExpressionParams,
  SuggestForExpressionResult,
} from './types';
import { isNullCheckOperator } from './utils';

const WHITESPACE_REGEX = /\s/;
const LAST_WORD_BOUNDARY_REGEX = /\b\w(?=\w*$)/;
// Matches tokens like "foo(" to recover function names when the AST is missing
const FUNCTION_CALL_REGEX = /\b([a-z_][a-z0-9_]*)\s*\(/gi;

/** Coordinates position detection, handler selection, and range attachment */
export async function suggestForExpression(
  params: SuggestForExpressionParams
): Promise<SuggestForExpressionResult> {
  const baseCtx = buildContext(params);
  const computed = computeDerivedState(baseCtx);

  const mapSuggestions = getMapExpressionSuggestions(baseCtx.innerText);

  if (mapSuggestions !== null) {
    return {
      suggestions: attachRanges(baseCtx, mapSuggestions),
      computed,
    };
  }

  const partialSuggestions = await trySuggestForPartialOperators(baseCtx);

  if (partialSuggestions !== null) {
    return {
      suggestions: attachRanges(baseCtx, partialSuggestions),
      computed,
    };
  }

  const suggestions = await dispatchStates(baseCtx, computed.position);

  return {
    suggestions: attachRanges(baseCtx, suggestions),
    computed,
  };
}

/**
 * Handles IN/NOT IN, LIKE/RLIKE, and IS/IS NOT operators.
 *
 * Use cases:
 * 1. Partial operator typing: "field IS ", "field IS N", "field LIKE "
 * 2. Complete operator without AST: "CASE(field IN(" - operator complete but no AST node
 *
 * - If valid AST node exists: uses it directly (preserves parser information)
 * - If AST missing/incomplete: creates synthetic node or suggests directly
 *
 * Skips when AST has a complete operator node - normal flow handles it.
 */
async function trySuggestForPartialOperators(
  ctx: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const { innerText, expressionRoot } = ctx;

  const detection = detectNullCheck(innerText) || detectLike(innerText) || detectIn(innerText);

  if (!detection) {
    return null;
  }

  // If we have an AST operator node, check if it's complete
  if (expressionRoot?.type === 'function') {
    const astOperatorName = expressionRoot.name?.toLowerCase();
    const isIncomplete = expressionRoot.incomplete;

    // Build list of all operator names that we handle in the partial system
    const managedPartialOperators = [
      ...nullCheckOperators.map((op) => op.name),
      ...inOperators.map((op) => op.name),
      ...patternMatchOperators.map((op) => op.name),
    ];

    // If AST has a complete operator node (not incomplete), let normal flow handle it
    if (managedPartialOperators.includes(astOperatorName) && !isIncomplete) {
      return null;
    }
  }

  return dispatchPartialOperators(detection.operatorName, detection, ctx);
}

/** Derives innerText and option flags from the incoming params.*/
function buildContext(params: SuggestForExpressionParams): ExpressionContext {
  const { query, cursorPosition } = params;
  const innerText = query.slice(0, cursorPosition);
  const isCursorFollowedByComma = query.slice(cursorPosition).trimStart().startsWith(',');
  const isCursorFollowedByParens = query.slice(cursorPosition).trimStart().startsWith('(');

  const baseOptions: ExpressionContextOptions = params.options ?? ({} as ExpressionContextOptions);
  const options: ExpressionContextOptions = {
    ...baseOptions,
    isCursorFollowedByComma,
    isCursorFollowedByParens,
  };

  return {
    query,
    cursorPosition,
    innerText,
    expressionRoot: params.expressionRoot,
    location: params.location!,
    command: params.command,
    context: params.context,
    callbacks: params.callbacks,
    options,
  };
}

/** Computes derived state from the expression context */
function computeDerivedState(ctx: ExpressionContext): ExpressionComputedMetadata {
  const { expressionRoot, innerText, cursorPosition, context } = ctx;
  const position: ExpressionPosition = getPosition(innerText, expressionRoot);
  const expressionType = getExpressionType(
    expressionRoot,
    context?.columns,
    context?.unmappedFieldsStrategy
  );
  const isComplete = isExpressionComplete(expressionType, innerText);
  const insideFunction =
    (expressionRoot &&
      isFunctionExpression(expressionRoot) &&
      within(cursorPosition, expressionRoot)) ||
    isMapExpressionInFunctionCall(innerText);

  return {
    innerText,
    position,
    expressionType,
    isComplete,
    insideFunction,
  };
}

/** Returns new suggestions array with range information */
function attachRanges(ctx: ExpressionContext, suggestions: ISuggestionItem[]): ISuggestionItem[] {
  const { innerText } = ctx;
  const lastChar = innerText[innerText.length - 1];
  const hasNonWhitespacePrefix = !WHITESPACE_REGEX.test(lastChar);

  return suggestions.map((suggestion) => {
    // Preserve existing rangeToReplace if already set (e.g., from map expression suggestions)
    if (suggestion.rangeToReplace) {
      return { ...suggestion };
    }

    if (isNullCheckOperator(suggestion.text)) {
      return {
        ...suggestion,
        rangeToReplace: getOverlapRange(innerText, suggestion.text),
      };
    }

    if (hasNonWhitespacePrefix) {
      return {
        ...suggestion,
        rangeToReplace: {
          start: innerText.search(LAST_WORD_BOUNDARY_REGEX),
          end: innerText.length,
        },
      };
    }

    return { ...suggestion };
  });
}

function getMapExpressionSuggestions(innerText: string): ISuggestionItem[] | null {
  if (!isInsideMapExpression(innerText)) {
    return null;
  }

  const functionName = getLastFunctionName(innerText);
  const functionDef = functionName && getFunctionDefinition(functionName);
  const mapParamsStr = functionDef && SignatureAnalyzer.extractMapParams(functionDef.signatures);

  if (!mapParamsStr) {
    return null;
  }

  const availableParameters = SignatureAnalyzer.parseMapParams(mapParamsStr);
  if (Object.keys(availableParameters).length === 0) {
    return null;
  }

  const suggestions = getCommandMapExpressionSuggestions(innerText, availableParameters, true);
  return suggestions.length > 0 ? suggestions : [];
}

function isMapExpressionInFunctionCall(innerText: string): boolean {
  if (!isInsideMapExpression(innerText)) {
    return false;
  }

  return getLastFunctionName(innerText) !== null;
}

function getLastFunctionName(innerText: string): string | null {
  // Limit search to the text before the current map and ignore function-like tokens inside strings
  const lastOpenBrace = innerText.lastIndexOf('{');
  const searchText = lastOpenBrace >= 0 ? innerText.slice(0, lastOpenBrace) : innerText;
  const textWithoutStrings = searchText.replace(DOUBLE_QUOTED_STRING_REGEX, ' ');

  const allMatches = [...textWithoutStrings.matchAll(FUNCTION_CALL_REGEX)];
  const fnMatch = allMatches.length > 0 ? allMatches[allMatches.length - 1] : null;

  return fnMatch ? fnMatch[1].toLowerCase() : null;
}
