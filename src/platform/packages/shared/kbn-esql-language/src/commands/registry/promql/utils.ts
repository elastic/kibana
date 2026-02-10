/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within } from '../../../ast/location';
import type { ESQLAstAllCommands, ESQLAstPromqlCommand } from '../../../types';
import { findFinalWord } from '../../definitions/utils/autocomplete/helpers';
import { childrenOfPromqlNode, findPromqlAstPosition } from '../../../promql/traversal';
import { PromQLParser } from '../../../promql';
import type {
  PromQLAstNode,
  PromQLAstQueryExpression,
  PromQLFunction,
  PromQLPositionResult,
} from '../../../promql/types';
import {
  getPromqlFunctionDefinition,
  isPromqlAcrossSeriesFunction,
} from '../../definitions/utils/promql';

// ============================================================================
// Types
// ============================================================================

type PromqlPositionType =
  | 'after_command' // PROMQL | → params, column names, functions
  | 'after_param_keyword' // PROMQL step | → =
  | 'after_param_equals' // PROMQL step=| → param values
  | 'inside_query' // fallback inside query zone → [] (no suggestions)
  | 'after_query' // PROMQL (rate(x)) | → pipe, operators, by
  | 'inside_grouping' // sum(...) by (| → labels (not yet implemented)
  | 'before_grouping' // sum(rate(x))| → by/without
  | 'after_complete_expression' // rate(bytes)  | → operators
  | 'inside_function_args' // sum( | → functions
  | 'after_open_paren' // (|, col0 = | → functions
  // Future positions (not yet implemented):
  | 'inside_label_selector' // metric{|} → labels
  | 'after_metric' // http_requests| → labels, operators
  | 'inside_time_range' // metric[|] → duration
  | 'after_binary_operator'; // a + | → functions

interface PromqlPosition {
  type: PromqlPositionType;
  currentParam?: string;
  canAddGrouping?: boolean;
}

// Shared identifier pattern for param names, column names, etc.
export const IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';

// Param zone detection
const TRAILING_PARAM_NAME_REGEX = /([A-Za-z_][A-Za-z0-9_]*)\s*$/;
const FUNCTION_ARG_START_TOKENS = ['(', ','];

// ============================================================================
// Main Entry Point
// ============================================================================

export function getPosition(
  innerText: string,
  command: ESQLAstAllCommands,
  commandText?: string
): PromqlPosition {
  const promqlCommand = command as ESQLAstPromqlCommand;

  const queryZonePosition = getQueryZonePosition(innerText, promqlCommand, commandText);

  if (queryZonePosition) {
    return queryZonePosition;
  }

  // Fallback to param zone detection (text-based, for transitional states)
  const innerCommandText = innerText.substring(promqlCommand.location.min);

  return getParamZonePosition(innerCommandText);
}

// ============================================================================
// Query zone detection (AST-based)
// ============================================================================

/**
 * Uses AST query location to decide whether the cursor is in/after the query.
 * We keep this separate to avoid misclassifying param edits as query edits.
 */
function getQueryZonePosition(
  innerText: string,
  promqlCommand: ESQLAstPromqlCommand,
  commandText?: string
): PromqlPosition | undefined {
  const queryNode = promqlCommand.query;
  const queryLocation = queryNode?.location;
  const cursorPosition = innerText.length;

  if (!isQueryLocationUsable(innerText, queryLocation)) {
    return undefined;
  }

  // After query zone: cursor past query.max
  if (queryLocation && innerText.length > queryLocation.max) {
    // Assignment `col0 = (query)`: cursor is past the outer `)`, where `by` can't go.
    // Grouping belongs inside the parens, so skip detection and only suggest pipe.
    const isAssignment =
      queryNode != null && extractPromqlLocationFromAssignment(queryNode) != null;
    const ctx =
      !isAssignment && commandText
        ? getPromQLQueryContext(promqlCommand, commandText, cursorPosition)
        : undefined;
    const canAddGrouping = ctx ? checkCanAddGrouping(ctx) : false;
    const hasTrailingWhitespace = innerText.trimEnd() !== innerText;

    if (!hasTrailingWhitespace && canAddGrouping) {
      return { type: 'before_grouping' };
    }

    return { type: 'after_query', canAddGrouping };
  }

  // Inside query zone: cursor within query bounds
  if (queryNode && within(innerText.length, queryNode)) {
    const ctx = commandText
      ? getPromQLQueryContext(promqlCommand, commandText, cursorPosition)
      : undefined;

    if (ctx) {
      if (checkInsideGrouping(ctx)) {
        return { type: 'inside_grouping' };
      }

      if (checkCanAddGrouping(ctx)) {
        return { type: 'before_grouping' };
      }

      if (checkAfterCompleteExpression(ctx)) {
        return { type: 'after_complete_expression' };
      }

      if (checkInsideFunctionArgs(ctx)) {
        return { type: 'inside_function_args' };
      }

      if (checkAtExpressionStart(ctx)) {
        return { type: 'after_open_paren' };
      }
    }

    // Fallback: cursor is inside query but no specific suggestion context detected
    return { type: 'inside_query' };
  }

  return undefined;
}

/**
 * Guards against the parser misclassifying params as the query.
 * Rejects invalid query locations (e.g., `PROMQL step` where "step" ends up in query.text).
 */
function isQueryLocationUsable(
  innerText: string,
  queryLocation: { min: number; max: number } | undefined
): boolean {
  if (queryLocation === undefined || queryLocation.max === queryLocation.min) {
    return false;
  }

  const queryText = innerText.substring(queryLocation.min, queryLocation.max + 1).trim();

  // Reject if empty or looks like a param assignment
  return queryText !== '' && !looksLikePromqlParamAssignment(queryText);
}

// ============================================================================
// Query Position Checks
// ============================================================================

interface PromQLQueryContext {
  text: string;
  start: number;
  root: PromQLAstQueryExpression;
  relativeCursor: number;
  logicalCursor: number;
  position: PromQLPositionResult;
}

/** Builds a reusable context for PromQL query analysis (parse once, use many). */
function getPromQLQueryContext(
  promqlCommand: ESQLAstPromqlCommand,
  commandText: string,
  cursorPosition: number
): PromQLQueryContext | undefined {
  const querySlice = getPromqlQuerySlice(promqlCommand, commandText);
  if (!querySlice) {
    return undefined;
  }

  const { text, start } = querySlice;
  // ES|QL parser treats PromQL as opaque text, must parse separately for typed AST
  const { root } = PromQLParser.parse(text);
  const relativeCursor = cursorPosition - start;
  let logicalCursor = Math.min(relativeCursor, text.length);

  /* Normalize trailing whitespace so we compare against the actual AST boundary. */
  while (logicalCursor > 0 && /\s/.test(text[logicalCursor - 1])) {
    logicalCursor -= 1;
  }

  const position = findPromqlAstPosition(root, relativeCursor);

  return { text, start, root, relativeCursor, logicalCursor, position };
}

/** Checks if cursor is inside a grouping clause (by/without). */
function checkInsideGrouping(ctx: PromQLQueryContext): boolean {
  const { node, parent } = ctx.position;

  // Direct match: cursor is on or inside a grouping node
  if (node?.type === 'grouping' || parent?.type === 'grouping') {
    return true;
  }

  // Check if cursor is inside any function's grouping (from position or root)
  const { expression } = ctx.root;
  const funcsToCheck = [parent, expression].filter(
    (expr): expr is PromQLFunction => expr?.type === 'function'
  );

  return funcsToCheck.some(
    ({ grouping }) => grouping && isCursorInsideGrouping(ctx.relativeCursor, grouping)
  );
}

/** Checks if cursor is logically inside a grouping (including right after open paren). */
function isCursorInsideGrouping(
  cursor: number,
  grouping: { location: { min: number; max: number }; args: unknown[] }
): boolean {
  if (within(cursor, grouping)) {
    return true;
  }

  // Right after open paren with empty args: `by (|`
  if (grouping.args.length === 0 && cursor === grouping.location.max + 1) {
    return true;
  }

  return false;
}

/** Checks if cursor is after a complete aggregation that can have grouping added. */
function checkCanAddGrouping(ctx: PromQLQueryContext): boolean {
  if (ctx.logicalCursor === 0) {
    return false;
  }

  const beforePosition = ctx.logicalCursor - 1;

  const nearest = findNearestAggregationForGrouping(ctx.root, beforePosition);
  if (nearest) {
    return true;
  }

  if (ctx.root.expression && !ctx.root.expression.incomplete) {
    return false;
  }

  // Fallback: AST incomplete, check text for complete aggregation like "avg(bytes)"
  const textBeforeCursor = ctx.text.slice(0, ctx.relativeCursor);
  const lastCloseParen = textBeforeCursor.lastIndexOf(')');

  if (lastCloseParen === -1) {
    return false;
  }

  const match = textBeforeCursor.slice(0, lastCloseParen + 1).match(/(\w+)\s*\([^)]*\)$/);

  return match ? isPromqlAcrossSeriesFunction(match[1]) : false;
}

/** Traverses the full PromQL AST to find the nearest across-series aggregation */
function findNearestAggregationForGrouping(
  root: PromQLAstNode,
  beforePosition: number
): PromQLFunction | undefined {
  let nearest: PromQLFunction | undefined;
  let nearestMax = -1;

  function traverse(node: PromQLAstNode): void {
    for (const child of childrenOfPromqlNode(node)) {
      traverse(child);
    }

    if (node.type !== 'function') {
      return;
    }

    const func = node as PromQLFunction;
    if (
      func.location.max <= beforePosition &&
      func.location.max > nearestMax &&
      func.args.length > 0 &&
      !func.grouping &&
      isPromqlAcrossSeriesFunction(func.name)
    ) {
      nearest = func;
      nearestMax = func.location.max;
    }
  }

  traverse(root);

  return nearest;
}

/** Checks if cursor is inside function args: `sum(|`, `sum( |`, or `sum(|)`. */
function checkInsideFunctionArgs(ctx: PromQLQueryContext): boolean {
  const { node, parent } = ctx.position;
  const func = getFunctionFromPosition(node, parent);

  if (!func) {
    return false;
  }

  const maxParams = getMaxParamsForFunction(func.name);
  const isStartingNewArg = isAtNewArgStart(ctx, func);
  const isWithinExistingArg = isCursorWithinAnyArg(ctx, func);

  if (isStartingNewArg && maxParams !== undefined) {
    return func.args.length < maxParams;
  }

  return isWithinExistingArg;
}

// ============================================================================
// Function Argument Helpers
// ============================================================================

/** Picks the closest function node from the position lookup (node or parent). */
function getFunctionFromPosition(
  node?: PromQLAstNode,
  parent?: PromQLAstNode
): PromQLFunction | undefined {
  if (node?.type === 'function') {
    return node as PromQLFunction;
  }

  if (parent?.type === 'function') {
    return parent as PromQLFunction;
  }

  return undefined;
}

/** Recursively finds the innermost function node that contains the cursor offset. */
function findInnermostFunctionAt(
  node: PromQLAstNode | undefined,
  offset: number
): PromQLFunction | undefined {
  if (!node || !within(offset, node)) {
    return undefined;
  }

  let match: PromQLFunction | undefined = node.type === 'function' ? node : undefined;

  for (const child of childrenOfPromqlNode(node)) {
    const childMatch = findInnermostFunctionAt(child, offset);
    if (childMatch) {
      match = childMatch;
    }
  }

  return match;
}

/** Uses function definitions to bound how many arguments can be suggested. */
function getMaxParamsForFunction(name: string): number | undefined {
  const definition = getPromqlFunctionDefinition(name);
  if (!definition) {
    return undefined;
  }

  return Math.max(...definition.signatures.map((signature) => signature.params.length));
}

/** Checks whether the cursor is at an argument boundary to allow a new param. */
function isAtNewArgStart(ctx: PromQLQueryContext, func: PromQLFunction): boolean {
  const { relativeCursor, text } = ctx;
  const { min, max } = func.location;
  const cursor = Math.min(Math.max(relativeCursor, min), max + 1);
  const beforeCursor = text.slice(min, cursor).trimEnd();

  if (beforeCursor.length === 0) {
    return false;
  }

  const lastChar = beforeCursor[beforeCursor.length - 1];
  return lastChar !== undefined && FUNCTION_ARG_START_TOKENS.includes(lastChar);
}

/** Verifies whether the cursor is still inside an existing argument node. */
function isCursorWithinAnyArg(ctx: PromQLQueryContext, func: PromQLFunction): boolean {
  const { relativeCursor } = ctx;

  for (const arg of func.args) {
    if (within(relativeCursor, arg)) {
      return true;
    }
  }

  return false;
}

/** Checks if cursor is after complete expression with trailing space: `rate(bytes) |`. */
function checkAfterCompleteExpression(ctx: PromQLQueryContext): boolean {
  const expr = ctx.root.expression;
  if (!expr || expr.incomplete) {
    return false;
  }

  if (expr.type !== 'function' && expr.type !== 'parens') {
    return false;
  }

  return ctx.relativeCursor > expr.location.max + 1;
}

/** Checks if cursor is at expression start: after `(` or after column `=`. */
function checkAtExpressionStart(ctx: PromQLQueryContext): boolean {
  const { text, relativeCursor } = ctx;
  const textBeforeCursor = text.slice(0, relativeCursor);
  const trimmed = textBeforeCursor.trimEnd();

  return trimmed.endsWith('(') || trimmed.endsWith('=');
}

// ============================================================================
// Function Resolution
// ============================================================================

interface FunctionResolutionResult {
  functionNode: PromQLFunction | undefined;
  fallback: { name: string; paramIndex: number } | undefined;
}

/* Resolves the PromQL function at cursor with AST + text-based fallback (single parse). */
export function resolveFunctionAtCursor(
  promqlCommand: ESQLAstPromqlCommand,
  commandText: string,
  cursorPosition: number
): FunctionResolutionResult {
  const ctx = getPromQLQueryContext(promqlCommand, commandText, cursorPosition);
  if (!ctx) {
    return { functionNode: undefined, fallback: undefined };
  }

  const { node, parent } = ctx.position;
  // Function directly found on the immediate node/parent (no nested traversal).
  const direct = getFunctionFromPosition(node, parent);
  const functionNode = direct ?? findInnermostFunctionAt(ctx.root.expression, ctx.relativeCursor);

  const beforeCursor = ctx.text.slice(0, ctx.relativeCursor);
  const openParenIndex = beforeCursor.lastIndexOf('(');
  let fallback: FunctionResolutionResult['fallback'];

  if (openParenIndex !== -1) {
    const beforeParen = beforeCursor.slice(0, openParenIndex).trimEnd();
    const name = getTrailingIdentifier(beforeParen);

    if (name) {
      const argsText = beforeCursor.slice(openParenIndex + 1);
      const paramIndex = argsText.split(',').length - 1;
      fallback = { name, paramIndex };
    }
  }

  return { functionNode, fallback };
}

/** Determines which function parameter the cursor is currently editing. */
export function getFunctionParamIndexAtCursor(
  command: ESQLAstPromqlCommand,
  commandText: string,
  cursorPosition: number,
  functionNode: PromQLFunction | undefined
): number {
  if (!functionNode) {
    return 0;
  }

  const querySlice = getPromqlQuerySlice(command, commandText);
  if (!querySlice) {
    return 0;
  }

  const relativeCursor = cursorPosition - querySlice.start;
  let index = 0;

  for (const arg of functionNode.args) {
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

  return index;
}

// ============================================================================
// Param zone detection (text-based)
// ============================================================================

/*
 * Fallback for editing states where the AST is unreliable (typing params).
 * We only look at the local text to avoid fighting incomplete AST nodes.
 */
function getParamZonePosition(commandText: string): PromqlPosition {
  const incompleteParam = getIncompleteParamFromText(commandText);

  if (incompleteParam) {
    return { type: 'after_param_equals', currentParam: incompleteParam };
  }

  if (isAfterParamKeyword(commandText)) {
    return { type: 'after_param_keyword' };
  }

  // Check if cursor is inside an open paren for query context (e.g., "PROMQL (" or "col0 = (")
  if (isInsideQueryParen(commandText)) {
    return { type: 'after_open_paren' };
  }

  return { type: 'after_command' };
}

/**
 * Detects if cursor is inside an open paren that starts a query context.
 * Handles cases like "PROMQL (" or "PROMQL col0 = (" where the AST doesn't
 * have a query node yet because the content is empty.
 */
function isInsideQueryParen(commandText: string): boolean {
  const trimmed = commandText.trimEnd();

  // Check for "(" or "= (" at the end, indicating start of query expression
  if (trimmed.endsWith('(') || trimmed.endsWith('= (')) {
    // Count open and close parens to ensure we're inside an unclosed paren
    let depth = 0;
    let inQuote: string | null = null;

    for (const char of trimmed) {
      if (inQuote) {
        if (char === inQuote) {
          inQuote = null;
        }
        continue;
      }

      if (char === '"' || char === "'") {
        inQuote = char;
      } else if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      }
    }

    // If we have unclosed parens, we're inside query context
    return depth > 0;
  }

  return false;
}

/** Extracts the trailing identifier from text (e.g., "start" from "end=value start"). */
function getTrailingIdentifier(text: string): string | undefined {
  const match = text.match(TRAILING_PARAM_NAME_REGEX);
  return match ? match[1] : undefined;
}

/** Extracts trailing identifier if it's a known PROMQL param name. */
function getTrailingParamName(text: string): string | undefined {
  const identifier = getTrailingIdentifier(text)?.toLowerCase();
  return identifier && isPromqlParamName(identifier) ? identifier : undefined;
}

/** Identifies a param assignment in progress (e.g., "step=") to suggest values. */
function getIncompleteParamFromText(text: string): string | undefined {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith('=')) {
    return undefined;
  }
  return getTrailingParamName(trimmed.slice(0, -1).trimEnd());
}

/** Detects "param name + space" pattern (e.g., "step ") to suggest "=". */
function isAfterParamKeyword(text: string): boolean {
  return text.endsWith(' ') && getTrailingParamName(text.trimEnd()) !== undefined;
}

/*
 * Extracts the PromQL query text and start position from the command.
 * Uses full commandText (up to pipe) so the PromQL parser gets balanced parentheses.
 * Returns the start position to convert absolute cursor to relative for AST comparison.
 */
function getPromqlQuerySlice(
  command: ESQLAstPromqlCommand,
  commandText: string
): { text: string; start: number } | undefined {
  const queryNode = command.query;
  if (!queryNode?.location) {
    return undefined;
  }

  // Handle column assignment syntax: "col= (promql_query)"
  const promqlLocation = extractPromqlLocationFromAssignment(queryNode) ?? queryNode.location;

  const { min } = promqlLocation;
  if (min < 0) {
    return undefined;
  }

  // commandText starts at command.location.min, so convert to relative position
  const commandStart = command.location.min;
  const relativeMin = min - commandStart;
  const text = commandText.slice(relativeMin).trimEnd();

  return text.length > 0 ? { text, start: min } : undefined;
}

/*
 * Extracts the inner query location from a column assignment expression.
 * For "col= (query)" syntax, strips the "col= " prefix from the location.
 * Without this, cursor positions would be off by the assignment length.
 */
function extractPromqlLocationFromAssignment(
  node: NonNullable<ESQLAstPromqlCommand['query']>
): { min: number; max: number } | undefined {
  // The ES|QL parser wraps this as a binary-expression with parens child.
  if (!('subtype' in node) || node.subtype !== 'binary-expression') {
    return undefined;
  }

  // Get the right-hand side (should be parens containing the PromQL)
  const args = 'args' in node ? node.args : undefined;
  if (!Array.isArray(args) || args.length < 2) {
    return undefined;
  }

  const rhsNode = args[1];
  if (!rhsNode || Array.isArray(rhsNode)) {
    return undefined;
  }

  if (rhsNode.type !== 'parens' || !('child' in rhsNode)) {
    return undefined;
  }

  return (rhsNode.child as { location?: { min: number; max: number } } | undefined)?.location;
}

// Param Definitions
// ============================================================================

export const PROMQL_KEYWORD = 'promql';

export enum PromqlParamValueType {
  TimeseriesSources = 'timeseries_sources',
  DateLiterals = 'date_literals',
  Static = 'static',
}

export enum PromqlParamName {
  Index = 'index',
  Step = 'step',
  Start = 'start',
  End = 'end',
}

export interface PromqlParamDefinition {
  name: string;
  description: string;
  valueType: PromqlParamValueType;
  required?: boolean;
  suggestedValues?: string[];
}

const PROMQL_PARAMS: PromqlParamDefinition[] = [
  {
    name: PromqlParamName.Index,
    description: 'Index pattern to query',
    valueType: PromqlParamValueType.TimeseriesSources,
  },
  {
    name: PromqlParamName.Step,
    description: 'Query resolution step (e.g. 1m, 5m, 1h)',
    valueType: PromqlParamValueType.Static,
    required: true,
  },
  {
    name: PromqlParamName.Start,
    description: 'Range query start time (requires end)',
    valueType: PromqlParamValueType.DateLiterals,
  },
  {
    name: PromqlParamName.End,
    description: 'Range query end time (requires start)',
    valueType: PromqlParamValueType.DateLiterals,
  },
];

export const PROMQL_PARAM_NAMES: string[] = PROMQL_PARAMS.map(({ name }) => name);

export const PROMQL_REQUIRED_PARAMS = PROMQL_PARAMS.filter(({ required }) => required).map(
  ({ name }) => name
);

/* Matches "param=" or "param =" but not "endpoint=" for param "end". */
const PARAM_ASSIGNMENT_PATTERNS = PROMQL_PARAM_NAMES.map((param) => ({
  param,
  pattern: new RegExp(`${param}\\s*=`, 'i'),
}));

export function getPromqlParamDefinitions(): PromqlParamDefinition[] {
  return PROMQL_PARAMS;
}

export function getPromqlParam(name: string): PromqlParamDefinition | undefined {
  return PROMQL_PARAMS.find((param) => param.name === name);
}

export function areRequiredPromqlParamsPresent(usedParams: Set<string>): boolean {
  return PROMQL_REQUIRED_PARAMS.every((param) => usedParams.has(param));
}

export const isPromqlParamName = (name: string): name is string =>
  PROMQL_PARAM_NAMES.includes(name);

// ============================================================================
// Param Detection Helpers (Text Scanning)
// ============================================================================

/**
 * Detects if text looks like a param assignment.
 * Matches: "index", "index=", "index=value", or ",..." (comma continuation).
 */
export function looksLikePromqlParamAssignment(text: string): boolean {
  const trimmed = text.trim().toLowerCase();

  if (trimmed.startsWith(',')) {
    return true;
  }

  return PROMQL_PARAM_NAMES.some((param) => {
    if (trimmed === param) {
      return true;
    }

    if (trimmed.startsWith(param)) {
      const afterParam = trimmed.substring(param.length).trimStart();
      return afterParam.startsWith('=');
    }

    return false;
  });
}

/** Scans command text to find used params (includes params after cursor for filtering). */
export function getUsedPromqlParamNames(commandText: string): Set<string> {
  const used = new Set<string>();

  for (const { param, pattern } of PARAM_ASSIGNMENT_PATTERNS) {
    if (pattern.test(commandText)) {
      used.add(param);
    }
  }

  return used;
}

/*
 * Prevents value suggestions when a concrete value already follows the cursor.
 * This keeps us from suggesting values in the middle of existing assignments.
 */
export function isParamValueComplete(
  fullQuery: string,
  cursorPosition: number,
  currentParam?: string
): boolean {
  const afterCursor = fullQuery.substring(cursorPosition).trimStart();

  if (!afterCursor) {
    return false;
  }

  const firstToken = afterCursor.split(/\s/)[0].toLowerCase();

  if (!firstToken) {
    return false;
  }

  // Cache the type guard result to avoid narrowing firstToken to never.
  const isParamToken = isPromqlParamName(firstToken);
  if (isParamToken) {
    return false;
  }

  const assignmentKey = `${firstToken}`.split('=')[0].toLowerCase();
  if (assignmentKey && isPromqlParamName(assignmentKey)) {
    return false;
  }

  if (!currentParam) {
    return true;
  }

  const definition = getPromqlParam(currentParam);
  if (!definition) {
    return true;
  }

  if (definition.valueType === PromqlParamValueType.Static) {
    return Boolean(definition.suggestedValues?.includes(firstToken));
  }

  if (definition.valueType === PromqlParamValueType.DateLiterals) {
    return isDateLiteralToken(firstToken);
  }

  if (definition.valueType === PromqlParamValueType.TimeseriesSources) {
    const token = firstToken as string;
    return !token.includes('=') && !token.includes('(');
  }

  return true;
}

function isDateLiteralToken(token: string): boolean {
  return token.startsWith('?_t') || token.startsWith('"') || token.startsWith("'");
}

/* Avoids suggesting a column assignment when the cursor is directly before a param token. */
export function isAtValidColumnSuggestionPosition(
  fullCommandText: string,
  cursorPosition: number
): boolean {
  const afterCursor = fullCommandText.substring(cursorPosition).trimStart();

  if (!afterCursor) {
    return true;
  }

  const firstToken = afterCursor.split(/\s/)[0];

  if (!firstToken) {
    return true;
  }

  const keyPart = firstToken.split('=')[0].toLowerCase();

  return !isPromqlParamName(keyPart);
}

// ============================================================================
// Column Assignment Helpers
// ============================================================================

/** Detects when the cursor is after a custom query assignment like "col0 =". */
export function isAfterCustomColumnAssignment(commandText: string): boolean {
  const trimmed = commandText.trimEnd();
  if (!trimmed.endsWith('=')) {
    return false;
  }

  const beforeEquals = trimmed.slice(0, -1).trimEnd();
  const name = getTrailingIdentifier(beforeEquals)?.toLowerCase();

  return name ? !isPromqlParamName(name) : false;
}

// ============================================================================
// Index Assignment Context
// ============================================================================

interface IndexAssignmentContext {
  valueText: string;
  valueStart: number;
}

/** Extracts the raw index value text so we can reuse source-suggestion logic. */
export function getIndexAssignmentContext(commandText: string): IndexAssignmentContext | undefined {
  const equalsIndex = commandText.lastIndexOf('=');

  if (equalsIndex < 0) {
    return undefined;
  }

  const beforeEquals = commandText.slice(0, equalsIndex).trimEnd();
  const key = findFinalWord(beforeEquals);

  const indexParam = PROMQL_PARAMS.find(
    ({ valueType }) => valueType === PromqlParamValueType.TimeseriesSources
  );
  if (!indexParam || key.toLowerCase() !== indexParam.name) {
    return undefined;
  }

  const afterEquals = commandText.slice(equalsIndex + 1);
  const valueStart = equalsIndex + 1 + (afterEquals.length - afterEquals.trimStart().length);

  return { valueText: commandText.slice(valueStart), valueStart };
}
