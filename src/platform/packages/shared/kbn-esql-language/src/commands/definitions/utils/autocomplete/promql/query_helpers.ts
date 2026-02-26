/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within } from '../../../../../ast/location';
import { PromqlWalker } from '../../../../../embedded_languages/promql/ast/walker';
import type {
  PromQLAstNode,
  PromQLAstQueryExpression,
  PromQLBinaryExpression,
  PromQLFunction,
  PromQLSelector,
} from '../../../../../embedded_languages/promql/types';
import type { PromQLFunctionParamType } from '../../../types';
import type { CursorMatch, PromqlDetailedPosition } from './types';
import {
  getPromqlFunctionDefinition,
  getPromqlFunctionParamTypes,
  isPromqlAcrossSeriesFunction,
} from '../../promql';
import { countTopLevelCommas, getTrailingIdentifier } from '../../shared';

// ============================================================================
// AST Helpers
// ============================================================================

const FUNCTION_ARG_START_TOKENS = ['(', ','];

/** Walks the AST to find the closest completed aggregation before the cursor. */
export function findNearestAggregation(
  root: PromQLAstQueryExpression,
  logicalCursor: number
): PromQLFunction | undefined {
  let nearest: PromQLFunction | undefined;

  if (!root.expression) {
    return undefined;
  }

  PromqlWalker.walk(root, {
    visitPromqlFunction: (node) => {
      const func = node as PromQLFunction;

      if (
        logicalCursor > 0 &&
        func.location.max <= logicalCursor - 1 &&
        func.args.length > 0 &&
        !func.grouping &&
        isPromqlAcrossSeriesFunction(func.name) &&
        (!nearest || func.location.max > nearest.location.max)
      ) {
        nearest = func;
      }
    },
  });

  return nearest;
}

/** Gets the binary-expression node nearest to cursor, if present in match chain. */
export function getBinaryNodeAtCursor(
  match: CursorMatch | undefined,
  outermostIncompleteBinary: PromQLBinaryExpression | undefined
): PromQLBinaryExpression | undefined {
  if (!match) {
    return undefined;
  }

  const nodeBinary = match.node.type === 'binary-expression' ? match.node : undefined;
  const parentBinary = match.parent?.type === 'binary-expression' ? match.parent : undefined;

  // Prefer incomplete binary nodes (where we're typing the RHS operand)
  if (parentBinary && parentBinary.incomplete && parentBinary.right.type === 'unknown') {
    return parentBinary;
  }

  if (nodeBinary && nodeBinary.incomplete && nodeBinary.right.type === 'unknown') {
    return nodeBinary;
  }

  if (outermostIncompleteBinary) {
    return outermostIncompleteBinary;
  }

  return undefined;
}

/** Finds selector in binary RHS where cursor is after it (searches function args only). */
export function findSelectorAfterBinaryInArgs(
  func: PromQLFunction,
  cursor: number
): PromQLSelector | undefined {
  for (const arg of func.args) {
    if (arg.type === 'binary-expression') {
      const { right } = arg as PromQLBinaryExpression;

      if (right.type === 'selector' && cursor >= right.location.max) {
        return right as PromQLSelector;
      }
    }
  }

  return undefined;
}

/** Uses function definitions to bound how many arguments can be suggested. */
export function getMaxParamsForFunction(name: string): number | undefined {
  const definition = getPromqlFunctionDefinition(name);
  if (!definition) {
    return undefined;
  }

  return Math.max(...definition.signatures.map((signature) => signature.params.length));
}

/**
 * Computes param index by walking function args and comparing cursor position.
 * Smart clamping: when cursor is past the last arg but no comma follows it,
 * stays on the current param (e.g., `rate(metric{job="a,b"} |)` -> param 0).
 */
export function computeParamIndexFromArgs(
  func: PromQLFunction,
  relativeCursor: number,
  text: string
): number {
  const { args } = func;
  let index = 0;

  for (const arg of args) {
    if (within(relativeCursor, arg)) {
      return index;
    }

    if (relativeCursor <= arg.location.min) {
      return index;
    }

    if (arg.location.max < relativeCursor) {
      index += 1;
      continue;
    }
  }

  if (args.length > 0 && index >= args.length) {
    const lastArg = args[args.length - 1];
    const textBetween = text.slice(lastArg.location.max + 1, relativeCursor);

    if (countTopLevelCommas(textBetween, 0, textBetween.length) === 0) {
      return args.length - 1;
    }
  }

  return index;
}

/** Checks if cursor is at an argument boundary in a function. */
export function isAtFunctionArgStart(text: string, cursor: number, func: PromQLFunction): boolean {
  const { min, max } = func.location;
  const clampedCursor = Math.min(Math.max(cursor, min), max + 1);
  const beforeCursor = text.slice(min, clampedCursor).trimEnd();

  if (beforeCursor.length === 0) {
    return false;
  }

  const lastChar = beforeCursor[beforeCursor.length - 1];

  return lastChar !== undefined && FUNCTION_ARG_START_TOKENS.includes(lastChar);
}

// ============================================================================
// Signature Helpers
// ============================================================================

/** Resolves signature types by walking up to the enclosing function. */
export function getSignatureTypesFromAncestors(
  text: string,
  cursor: number,
  innermostFunc?: PromQLFunction,
  funcAtCursor?: PromQLAstNode
): PromQLFunctionParamType[] {
  const functionNode =
    innermostFunc ??
    (funcAtCursor?.type === 'function' ? (funcAtCursor as PromQLFunction) : undefined);
  let resolvedContext: { name: string; paramIndex: number } | undefined;

  // AST-first: complete AST function -> AST resolution only.
  if (functionNode && !functionNode.incomplete) {
    let paramIndex =
      functionNode.args.length > 0 ? computeParamIndexFromArgs(functionNode, cursor, text) : 0;
    const maxParams = getMaxParamsForFunction(functionNode.name);

    if (maxParams !== undefined && paramIndex >= maxParams) {
      paramIndex = maxParams - 1;
    }
    resolvedContext = { name: functionNode.name, paramIndex };
  } else {
    // Fallback: AST missing/incomplete -> text context.
    const cursorLocalContext = getTextBasedFunctionContext(text, cursor);
    const astScopedContext = functionNode?.incomplete
      ? getTextBasedFunctionContext(text, cursor, functionNode)
      : undefined;
    resolvedContext = cursorLocalContext ?? astScopedContext;
  }

  if (!resolvedContext) {
    return [];
  }

  return getPromqlFunctionParamTypes(resolvedContext.name, resolvedContext.paramIndex);
}

// ============================================================================
// Text Fallback Helpers
// ============================================================================

const IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_:.]*';
const LABEL_ENTRY_ALLOWED_NEXT_CHAR_REGEX = /[A-Za-z0-9_,"'}\s]/;
const LEADING_IDENTIFIER_REGEX = new RegExp(`^(${IDENTIFIER_PATTERN})(.*)$`);

/** Returns true when cursor is after an aggregation function name before `(`, e.g. `sum |`. */
export function isAfterAggregationName(textBeforeCursor: string): boolean {
  const trailingIdentifier = getTrailingIdentifier(textBeforeCursor.trimEnd());

  return trailingIdentifier ? isPromqlAcrossSeriesFunction(trailingIdentifier) : false;
}

/** Text fallback for label maps where the AST is unreliable. */
export function getLabelMapTextFallbackPosition(
  text: string,
  cursor: number
): PromqlDetailedPosition | undefined {
  const beforeCursor = text.slice(0, cursor);
  const openBraceIndex = beforeCursor.lastIndexOf('{');

  if (openBraceIndex === -1) {
    return undefined;
  }

  const closeBraceIndex = beforeCursor.lastIndexOf('}');

  if (closeBraceIndex > openBraceIndex) {
    return undefined;
  }

  const selectorEntryBeforeCursor =
    beforeCursor
      .slice(openBraceIndex + 1)
      .split(',')
      .pop() ?? '';
  const trimmedEntryBeforeCursor = selectorEntryBeforeCursor.trim();
  const entryHeadIdentifier = getTrailingIdentifier(trimmedEntryBeforeCursor);
  const afterCursor = text.slice(cursor).trimStart();
  const nextChar = afterCursor[0];

  if (!entryHeadIdentifier && nextChar && !LABEL_ENTRY_ALLOWED_NEXT_CHAR_REGEX.test(nextChar)) {
    return { type: 'after_label_brace' };
  }

  const leadingIdentifierMatch = trimmedEntryBeforeCursor.match(LEADING_IDENTIFIER_REGEX);

  if (!leadingIdentifierMatch) {
    return undefined;
  }

  const tailAfterIdentifier = leadingIdentifierMatch[2]?.trimStart() ?? '';

  if (tailAfterIdentifier.length === 0) {
    return { type: 'after_label_name' };
  }

  if (tailAfterIdentifier.includes('"') || tailAfterIdentifier.includes("'")) {
    return undefined;
  }

  return { type: 'after_label_operator' };
}

/** Returns true when cursor is inside a grouping clause with a trailing identifier. */
export function hasGroupingTrailingIdentifier(
  text: string,
  cursor: number,
  groupingStart: number
): boolean {
  const from = Math.max(0, groupingStart);
  const to = Math.min(cursor, text.length);

  if (from >= to) {
    return false;
  }

  const groupingTextBeforeCursor = text.slice(from, to);
  const openParenIndex = groupingTextBeforeCursor.lastIndexOf('(');
  const groupingArgsBeforeCursor =
    openParenIndex >= 0
      ? groupingTextBeforeCursor.slice(openParenIndex + 1)
      : groupingTextBeforeCursor;

  return getTrailingIdentifier(groupingArgsBeforeCursor.trimEnd()) !== undefined;
}

/** Text-based function context: function name + current param index. */
function getTextBasedFunctionContext(
  text: string,
  cursor: number,
  func?: PromQLFunction
): { name: string; paramIndex: number } | undefined {
  const beforeCursor = text.slice(0, cursor);
  const openParenIndex = func
    ? text.indexOf('(', func.location.min)
    : beforeCursor.lastIndexOf('(');

  if (openParenIndex === -1) {
    return undefined;
  }

  if (openParenIndex >= cursor) {
    return {
      name: func?.name ?? '',
      paramIndex: 0,
    };
  }

  const name = func?.name ?? getTrailingIdentifier(beforeCursor.slice(0, openParenIndex).trimEnd());

  if (!name) {
    return undefined;
  }

  const paramIndex = countTopLevelCommas(beforeCursor, openParenIndex + 1, beforeCursor.length);

  return { name, paramIndex };
}
