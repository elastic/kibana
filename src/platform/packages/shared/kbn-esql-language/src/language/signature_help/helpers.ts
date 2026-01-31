/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within } from '../../ast';
import type {
  ESQLAstPromqlCommand,
  ESQLBinaryExpression,
  ESQLFunction,
  ESQLParens,
} from '../../types';
import type { PromQLAstExpression, PromQLAstNode, PromQLFunction } from '../../promql/types';
import { childrenOfPromqlNode } from '../../promql/traversal';
import { getPromqlFunctionDefinition } from '../../commands/definitions/utils/promql';

/**
 * Extracts the parameter list from a formatted function signature.
 */
export function getParameterList(formattedSignature: string) {
  const parameters: string[] = [];
  const openParenIndex = formattedSignature.indexOf('(');
  const closeParenIndex = formattedSignature.lastIndexOf(')');

  if (openParenIndex !== -1 && closeParenIndex !== -1 && closeParenIndex > openParenIndex) {
    const paramsSection = formattedSignature.substring(openParenIndex + 1, closeParenIndex);

    // Split by comma and clean up whitespace/newlines
    const paramParts = paramsSection
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    parameters.push(...paramParts);
  }
  return parameters;
}

/**
 * Determines which parameter should be highlighted in signature help based on cursor position.
 *
 * @param innerText - The query text up to the cursor position
 * @param fnNode - The function AST node
 * @param offset - The cursor offset in the full query
 * @returns The index of the parameter to highlight (0-based)
 *
 * Examples:
 * - `COUNT_DISTINCT(|` -> 0 (cursor after opening paren)
 * - `COUNT_DISTINCT(field|` -> 0 (cursor within first arg)
 * - `COUNT_DISTINCT(field,|` -> 1 (cursor after comma)
 * - `COUNT_DISTINCT(field, |` -> 1 (cursor after comma with space)
 * - `COUNT_DISTINCT(field, 10|` -> 1 (cursor within second arg)
 */
export function getArgumentToHighlightIndex(
  innerText: string,
  fnNode: ESQLFunction,
  offset: number
): number {
  // If cursor is right after opening parenthesis, highlight first parameter
  if (innerText.trimEnd().endsWith('(')) {
    return 0;
  }

  // Find which argument contains or precedes the cursor
  for (let i = 0; i < fnNode.args.length; i++) {
    const arg = fnNode.args[i];

    // Skip if arg doesn't have location info
    if (!arg || (typeof arg === 'object' && !('location' in arg))) {
      continue;
    }

    // Case 1: Cursor is within this argument's range
    if (within(offset - 1, arg)) {
      return i;
    }

    // Case 2: Cursor is after this argument but before the next
    // This handles: `fn(arg1,| arg2)` or `fn(arg1, |arg2)`
    const argEnd = arg.location.max;
    const nextArg = fnNode.args[i + 1];

    if (nextArg && 'location' in nextArg) {
      const nextArgStart = nextArg.location.min;
      // If cursor is between this arg's end and next arg's start, highlight next arg
      if (offset - 1 >= argEnd && offset - 1 < nextArgStart) {
        return i + 1;
      }
    } else if (offset - 1 >= argEnd) {
      // No next argument and cursor is after this arg, highlight the next position
      return i + 1;
    }
  }

  // Default: highlight last argument position
  return Math.max(fnNode.args.length - 1, 0);
}

// ============================================================================
// PromQL Helpers
// ============================================================================

/**
 * Isolates the PromQL expression text and its starting position from the command.
 *
 * Handles three query formats:
 * - Direct parens: `PROMQL (rate(...))`
 * - Raw expression: `PROMQL rate(...)`
 * - Named assignment: `PROMQL col0 = (rate(...))`
 */
export function extractPromqlText(
  query: ESQLAstPromqlCommand['query'],
  fullText: string
): { text: string; start: number } | undefined {
  if (!query) {
    return undefined;
  }

  // Direct parens: (query)
  if (query.type === 'parens') {
    return extractFromParens(query as ESQLParens, fullText);
  }

  // Raw PromQL expression without wrapper
  if ('expression' in query) {
    const { min, max } = query.location;

    return { text: fullText.substring(min, max + 1), start: min };
  }

  // Named assignment: col0 = (query)
  if (query.type === 'function' && 'subtype' in query && query.subtype === 'binary-expression') {
    const rightSide = (query as ESQLBinaryExpression<'='>).args[1];

    if (rightSide && 'type' in rightSide && rightSide.type === 'parens') {
      return extractFromParens(rightSide as ESQLParens, fullText);
    }
  }

  return undefined;
}

/** Extracts text inside parentheses, skipping the opening paren. */
function extractFromParens(parens: ESQLParens, fullText: string): { text: string; start: number } {
  const start = parens.location.min + 1;

  return { text: fullText.substring(start, parens.location.max), start };
}

/**
 * Finds the innermost PromQL function at cursor position.
 * Falls back to text-based search when AST has empty args due to incomplete syntax.
 */
export function findPromqlFunctionAtOffset(
  expression: PromQLAstExpression,
  offset: number,
  fullText?: string
): PromQLFunction | undefined {
  const astMatch = findPromqlFunctionInAst(expression, offset);

  if (!astMatch?.incomplete || !fullText) {
    return astMatch;
  }

  // Text fallback: nested functions may not be in AST due to parser limitations
  const lastArg = astMatch.args.at(-1);
  const cursorAfterArgs = !lastArg || offset > lastArg.location.max;

  if (!cursorAfterArgs) {
    return astMatch;
  }

  return findPromqlFunctionFromText(fullText, astMatch.location.min, offset) ?? astMatch;
}

/** Traverses AST to find innermost function containing cursor. */
function findPromqlFunctionInAst(
  expression: PromQLAstExpression,
  offset: number
): PromQLFunction | undefined {
  let match: PromQLFunction | undefined;

  const visit = (node: PromQLAstNode) => {
    const isIncomplete = 'incomplete' in node && node.incomplete;
    if (!within(offset, node) && !isIncomplete) return;

    if (node.type === 'function') {
      match = node as PromQLFunction;
    }

    for (const child of childrenOfPromqlNode(node)) {
      visit(child);
    }
  };

  visit(expression);

  return match;
}

/**
 * Text-based fallback to find the innermost function when AST parsing fails.
 * Scans backwards for first unclosed '(' preceded by a PromQL function name.
 */
function findPromqlFunctionFromText(
  fullText: string,
  startOffset: number,
  cursorOffset: number
): PromQLFunction | undefined {
  const text = fullText.substring(startOffset, cursorOffset);
  let parenDepth = 0;

  for (let i = text.length - 1; i >= 0; i--) {
    const char = text[i];

    if (char === ')') {
      parenDepth++;
      continue;
    }

    if (char === '(') {
      if (parenDepth > 0) {
        parenDepth--;
        continue;
      }

      // Found unclosed '(' - check if preceded by a PromQL function name
      const textBeforeParen = text.substring(0, i).trimEnd();
      const nameMatch = textBeforeParen.match(/([a-zA-Z_]\w*)$/);

      if (nameMatch && getPromqlFunctionDefinition(nameMatch[1])) {
        const name = nameMatch[1];
        const fnStart = startOffset + textBeforeParen.length - name.length;

        return {
          name,
          location: { min: fnStart, max: cursorOffset },
        } as PromQLFunction;
      }
    }
  }

  return undefined;
}

/**
 * Counts commas at depth zero to determine which function argument the cursor is in.
 * Text-based because PromQL parser returns empty args for incomplete syntax.
 */
export function calculatePromqlArgIndex(
  fullText: string,
  functionNode: PromQLFunction,
  offset: number
): number {
  const { min, max } = functionNode.location;
  const fnText = fullText.substring(min, max);
  const parenIndex = fnText.indexOf('(');

  if (parenIndex === -1) return 0;

  const argsText = fullText.substring(min + parenIndex + 1, offset);

  return countTopLevelCommas(argsText);
}

/** Counts commas at depth zero, ignoring those inside parens, brackets, or strings. */
function countTopLevelCommas(text: string): number {
  let count = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let stringDelimiter: string | null = null;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prevChar = text[i - 1];

    // Toggle string state on unescaped quotes
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      stringDelimiter = stringDelimiter === char ? null : stringDelimiter ?? char;
      continue;
    }

    if (stringDelimiter) continue;

    switch (char) {
      case '(':
        parenDepth++;
        break;
      case ')':
        parenDepth--;
        break;
      case '[':
        bracketDepth++;
        break;
      case ']':
        bracketDepth--;
        break;
      case ',':
        if (parenDepth === 0 && bracketDepth === 0) count++;
        break;
    }
  }

  return count;
}
