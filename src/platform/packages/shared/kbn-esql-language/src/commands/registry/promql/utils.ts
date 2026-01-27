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
import { isPromqlAcrossSeriesFunction } from '../../definitions/utils/promql';

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

// ============================================================================
// Regex Patterns
// ============================================================================

// Param zone detection
const TRAILING_PARAM_NAME_REGEX = /([A-Za-z_][A-Za-z0-9_]*)\s*$/;

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
    const ctx = commandText
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

  const exactPosition = ctx.logicalCursor - 1;
  const position = findPromqlAstPosition(
    ctx.root,
    within(exactPosition, ctx.root) ? exactPosition : -1
  );
  let functionNode: PromQLFunction | undefined;

  if (position.node?.type === 'function') {
    functionNode = position.node;
  } else if (position.parent?.type === 'function') {
    functionNode = position.parent;
  }

  // If AST found a valid aggregation, use it
  if (
    functionNode &&
    functionNode.location.max === exactPosition &&
    !functionNode.grouping &&
    functionNode.args.length > 0
  ) {
    return isPromqlAcrossSeriesFunction(functionNode.name);
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

/** Checks if cursor is inside function args: `sum(|`, `sum( |`, or `sum(|)`. */
function checkInsideFunctionArgs(ctx: PromQLQueryContext): boolean {
  const { parent } = ctx.position;

  if (parent?.type !== 'function') {
    return false;
  }

  const func = parent as PromQLFunction;

  return func.args.length === 0;
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

  return { type: 'after_command' };
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
export function getPromqlQuerySlice(
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

interface FunctionSearchResult {
  exactMatch?: PromQLFunction;
  nearestAggregation?: PromQLFunction;
}

/** Finds exactMatch (function at position) and nearestAggregation (closest aggregation before position). */
export function findFunctionForGrouping(
  root: PromQLAstNode,
  exactPosition: number,
  beforePosition: number
): FunctionSearchResult {
  const result: FunctionSearchResult = {};
  let nearestMax = -1;

  function traverse(node: PromQLAstNode): void {
    for (const child of childrenOfPromqlNode(node)) {
      traverse(child);
    }

    if (node.type !== 'function') {
      return;
    }

    if (node.location.max === exactPosition && within(exactPosition, root)) {
      result.exactMatch = node;
    }

    // Check for nearest aggregation before (with filtering)
    if (
      node.location.max < beforePosition &&
      node.location.max > nearestMax &&
      node.args.length > 0 &&
      !node.grouping &&
      isPromqlAcrossSeriesFunction(node.name)
    ) {
      result.nearestAggregation = node;
      nearestMax = node.location.max;
    }
  }

  traverse(root);
  return result;
}

// ============================================================================
// Param Definitions
// ============================================================================

export enum PromqlParamValueType {
  TimeseriesSources = 'timeseries_sources',
  DateLiterals = 'date_literals',
  Static = 'static',
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
    name: 'index',
    description: 'Index pattern to query',
    valueType: PromqlParamValueType.TimeseriesSources,
  },
  {
    name: 'step',
    description: 'Query resolution step (e.g. 1m, 5m, 1h)',
    valueType: PromqlParamValueType.Static,
    required: true,
  },
  {
    name: 'start',
    description: 'Range query start time (requires end)',
    valueType: PromqlParamValueType.DateLiterals,
  },
  {
    name: 'end',
    description: 'Range query end time (requires start)',
    valueType: PromqlParamValueType.DateLiterals,
  },
];

export const PROMQL_PARAM_NAMES: string[] = PROMQL_PARAMS.map(({ name }) => name);

const PROMQL_REQUIRED_PARAMS = PROMQL_PARAMS.filter(({ required }) => required).map(
  ({ name }) => name
);

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
  const tokens = commandText.toLowerCase().split(/\s+/);

  for (const param of PROMQL_PARAM_NAMES) {
    if (tokens.some((token) => token === param || token.startsWith(`${param}=`))) {
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
