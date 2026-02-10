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
import { correctPromqlQuerySyntax, getBracketsToClose } from '../../definitions/utils/ast';
import { PromqlWalker } from '../../../promql/walker';
import { PromQLParser } from '../../../promql';
import type {
  PromQLAstNode,
  PromQLAstQueryExpression,
  PromQLFunction,
  PromQLLabel,
  PromQLLabelMap,
  PromQLPositionResult,
  PromQLSelector,
} from '../../../promql/types';
import {
  getPromqlFunctionDefinition,
  getPromqlParamTypesForFunction,
  isPromqlAcrossSeriesFunction,
} from '../../definitions/utils/promql';
import type { PromQLFunctionParamType } from '../../definitions/types';

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
  | 'inside_function_args' // sum( | → functions
  | 'after_complete_arg' // sum(1 |) → comma or nothing
  | 'after_open_paren' // (|, col0 = | → functions
  | 'after_label_brace' // metric{| or metric{job="api",| → labels
  | 'after_label_name' // metric{job| → TODO: label operators when ES provides them
  | 'after_label_operator' // metric{job=| → label value placeholder
  | 'after_label_selector' // metric{job="api"} | → range selector [5m]
  | 'after_metric'; // http_requests| → labels

interface PromqlPosition {
  type: PromqlPositionType;
  currentParam?: string;
  canAddGrouping?: boolean;
  selector?: PromQLSelector;
  isCompleteLabel?: boolean;
  canSuggestCommaInFunctionArgs?: boolean;
  signatureTypes?: PromQLFunctionParamType[];
}

function isLabelMapNode(node?: PromQLAstNode): node is PromQLLabelMap {
  return node?.type === 'label-map';
}

// Shared identifier pattern for param names, column names, etc.
export const IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';

// Param zone detection
const TRAILING_PARAM_NAME_REGEX = new RegExp(`(${IDENTIFIER_PATTERN})\\s*$`);
const FUNCTION_ARG_START_TOKENS = ['(', ','];
const AFTER_LABEL_OPERATOR_REGEX = /\{[^}]*[=~]$/;

// ============================================================================
// Main Entry Point
// ============================================================================

export function getPosition(
  innerText: string,
  command: ESQLAstAllCommands,
  commandText: string | undefined
): PromqlPosition {
  const promqlCommand = command as ESQLAstPromqlCommand;
  const ctx = commandText
    ? getPromQLQueryContext(promqlCommand, commandText, innerText.length)
    : undefined;

  const queryZonePosition = getQueryZonePosition(innerText, promqlCommand, ctx);

  if (queryZonePosition) {
    return queryZonePosition;
  }

  if (commandText && isInsideQueryParen(commandText)) {
    return { type: 'after_open_paren' };
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
  ctx?: PromQLQueryContext
): PromqlPosition | undefined {
  const queryNode = promqlCommand.query;
  const { queryLocation, wrappedParens } = getPromqlQueryLocations(queryNode);

  if (!isQueryLocationUsable(innerText, queryLocation)) {
    return undefined;
  }

  // Zone 1: cursor past everything (including wrapper parens if any)
  if (queryLocation && innerText.length > (wrappedParens?.max ?? queryLocation.max)) {
    const canAddGrouping = !wrappedParens && ctx ? checkCanAddGrouping(ctx) : false;

    return { type: 'after_query', canAddGrouping };
  }

  // Zone 2: cursor between inner expression and outer parens wrapper
  if (queryLocation && wrappedParens && innerText.length > queryLocation.max) {
    const canAddGrouping = ctx ? checkCanAddGrouping(ctx) : false;

    return { type: 'inside_query', canAddGrouping };
  }

  // Inside query zone: cursor within query bounds
  if (queryNode && within(innerText.length, queryNode)) {
    if (ctx) {
      const groupingPosition = getGroupingPosition(ctx);
      if (groupingPosition) {
        return groupingPosition;
      }

      const labelPosition = getLabelSelectorPosition(ctx);
      if (labelPosition) {
        return labelPosition;
      }

      // Text fallback: ANTLR loses label structure inside functions (e.g. `rate(metric{job= `)
      if (AFTER_LABEL_OPERATOR_REGEX.test(ctx.textBeforeCursorTrimmed)) {
        return { type: 'after_label_operator' };
      }

      const selectorAfterLabels = ctx.selectorAfterLabelSelector;
      if (selectorAfterLabels) {
        return {
          type: 'after_label_selector',
          selector: selectorAfterLabels,
          signatureTypes: resolveSignatureTypesFromCtx(ctx),
        };
      }

      const selectorAfterMetric = ctx.selectorAfterMetric;
      if (selectorAfterMetric) {
        return {
          type: 'after_metric',
          selector: selectorAfterMetric,
          signatureTypes: resolveSignatureTypesFromCtx(ctx),
        };
      }

      const canAddGrouping = checkCanAddGrouping(ctx);

      if (canAddGrouping || checkAfterCompleteExpression(ctx)) {
        return { type: 'inside_query', canAddGrouping };
      }

      const funcPos = getFunctionPosition(ctx);
      if (funcPos) {
        return funcPos;
      }

      // Fallback: cursor at expression start (after `(` or `=`) with no AST function
      if (ctx.lastChar === '(' || ctx.lastChar === '=') {
        return {
          type: 'after_open_paren',
          signatureTypes: resolveSignatureTypesFromCtx(ctx),
        };
      }
    }

    // Fallback: cursor is inside query but no specific suggestion context detected
    return { type: 'inside_query', canAddGrouping: ctx ? checkCanAddGrouping(ctx) : false };
  }

  return undefined;
}

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

/** Determines position within a label selector `{label="value"}`. */
function getLabelSelectorPosition(ctx: PromQLQueryContext): PromqlPosition | undefined {
  const { node, parent } = ctx.position;

  // Inside label-map but not on a specific label: `{|}` or `{job="api",|}`
  if (isLabelMapNode(node)) {
    return { type: 'after_label_brace' };
  }

  // After a comma inside label-map: `{job="api", |}` → suggest labels
  if (
    ctx.lastChar === ',' &&
    (parent?.type === 'label-map' || parent?.type === 'label' || isLabelMapNode(node))
  ) {
    return { type: 'after_label_brace' };
  }

  // On identifier inside label-map (not inside label): `{job|}` incomplete label name
  if (parent?.type === 'label-map' && node?.type === 'identifier') {
    return { type: 'after_label_name' };
  }

  // Inside a parsed label node or on a label node inside a label-map
  if (parent?.type === 'label') {
    const labelPosition = getPositionFromLabel(parent as PromQLLabel);
    if (labelPosition) {
      return labelPosition;
    }
  }

  if (parent?.type === 'label-map' && node?.type === 'label') {
    const labelPosition = getPositionFromLabel(node as PromQLLabel);
    if (labelPosition) {
      return labelPosition;
    }
  }

  // Cursor on selector: determine position within its parts
  if (node?.type === 'selector') {
    return getPositionFromSelector(ctx, node as PromQLSelector);
  }

  return undefined;
}

/** Determines position when cursor is on a selector node (metric, labels, range). */
function getPositionFromSelector(
  ctx: PromQLQueryContext,
  selector: PromQLSelector
): PromqlPosition | undefined {
  const { metric, labelMap } = selector;

  // Cursor after metric, before labelMap (or no labelMap) → after_metric
  if (
    metric &&
    ctx.relativeCursor > metric.location.max &&
    (!labelMap || ctx.relativeCursor < labelMap.location.min)
  ) {
    return { type: 'after_metric', selector };
  }

  if (!labelMap) {
    return undefined;
  }

  if (ctx.relativeCursor < labelMap.location.min) {
    return undefined;
  }

  if (labelMap.args.length === 0) {
    return { type: 'after_label_brace' };
  }

  const lastLabel = labelMap.args[labelMap.args.length - 1];
  if (ctx.lastChar === ',') {
    return { type: 'after_label_brace' };
  }

  const labelPosition = getPositionFromLabel(lastLabel);
  if (labelPosition) {
    return labelPosition;
  }

  // Incomplete label map (no closing `}`): suggest more labels
  if (labelMap.incomplete) {
    return { type: 'after_label_brace' };
  }

  // Both labelMap and lastLabel complete → cursor is past closing `}`
  if (ctx.relativeCursor > lastLabel.location.max) {
    return { type: 'after_label_selector', selector };
  }

  return undefined;
}

function getPositionFromLabel(label: PromQLLabel): PromqlPosition | undefined {
  if (label.incomplete && !label.value) {
    return { type: 'after_label_operator' };
  }

  if (!label.value) {
    return { type: 'after_label_name' };
  }

  return { type: 'after_label_brace', isCompleteLabel: true };
}

/** Position detection for grouping clause (by/without). */
function getGroupingPosition(ctx: PromQLQueryContext): PromqlPosition | undefined {
  if (!ctx.groupingAtCursor) {
    return undefined;
  }

  if (ctx.textBeforeCursorTrimmed.endsWith(',')) {
    return { type: 'inside_grouping', isCompleteLabel: false };
  }

  return { type: 'inside_grouping', isCompleteLabel: ctx.groupingLabelComplete };
}

/** Position detection for function arguments. */
function getFunctionPosition(ctx: PromQLQueryContext): PromqlPosition | undefined {
  const func = ctx.functionAtCursor ?? ctx.innermostFunction;
  if (!func) {
    return undefined;
  }

  const signatureTypes = resolveSignatureTypesFromCtx(ctx);

  // At arg boundary (after `(` or `,`) → new arg
  if (isAtNewArgStart(ctx, func)) {
    const maxParams = getMaxParamsForFunction(func.name);
    if (maxParams !== undefined && func.args.length >= maxParams) {
      return undefined;
    }

    return { type: 'inside_function_args', signatureTypes };
  }

  // Within existing arg
  if (isCursorWithinAnyArg(ctx, func)) {
    return { type: 'inside_function_args', signatureTypes };
  }

  // After last complete arg → comma or next args
  return getPositionAfterCompleteArg(ctx, func, signatureTypes);
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
  textBeforeCursorTrimmed: string;
  start: number;
  root: PromQLAstQueryExpression;
  relativeCursor: number;
  position: PromQLPositionResult;
  innermostFunction?: PromQLFunction;
  nearestAggregation?: PromQLFunction;
  functionAtCursor?: PromQLFunction;
  selectorAfterMetric?: PromQLSelector;
  selectorAfterLabelSelector?: PromQLSelector;
  groupingAtCursor?: boolean;
  groupingLabelComplete?: boolean;
  lastChar?: string;
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

  const { text, start, originalLength } = querySlice;
  const { root } = PromQLParser.parse(text);
  const relativeCursor = Math.min(cursorPosition - start, originalLength);
  const textBeforeCursorTrimmed = text.slice(0, relativeCursor).trimEnd();

  const position: PromQLPositionResult = { node: undefined, parent: undefined };
  let innermostFunction: PromQLFunction | undefined;
  let nearestAggregation: PromQLFunction | undefined;
  let selectorAfterMetric: PromQLSelector | undefined;
  let selectorAfterLabelSelector: PromQLSelector | undefined;
  let groupingAtCursor = false;
  let groupingLabelComplete = false;
  const logicalCursor = textBeforeCursorTrimmed.length;

  if (root.expression) {
    PromqlWalker.walk(root, {
      visitPromqlAny: (node, parent) => {
        if (
          within(relativeCursor, node) ||
          (node.incomplete && relativeCursor > node.location.max)
        ) {
          position.node = node;
          position.parent = parent as PromQLAstNode | undefined;
        }

        if (node.type === 'function') {
          const func = node as PromQLFunction;

          if (within(relativeCursor, func)) {
            innermostFunction = func;
          }

          if (
            logicalCursor > 0 &&
            func.location.max <= logicalCursor - 1 &&
            func.args.length > 0 &&
            !func.grouping &&
            isPromqlAcrossSeriesFunction(func.name) &&
            (!nearestAggregation || func.location.max > nearestAggregation.location.max)
          ) {
            nearestAggregation = func;
          }
        }

        if (node.type === 'selector' && parent?.type === 'function') {
          const selector = node as PromQLSelector;
          const parentFunction = parent as PromQLFunction;

          if (!within(relativeCursor, parentFunction)) {
            return;
          }

          if (
            selector.metric &&
            !selector.labelMap &&
            !selector.duration &&
            relativeCursor > selector.metric.location.max &&
            (!selectorAfterMetric ||
              selector.metric.location.max > selectorAfterMetric.metric!.location.max)
          ) {
            selectorAfterMetric = selector;
          }

          if (
            selector.labelMap &&
            !selector.duration &&
            relativeCursor > selector.labelMap.location.max &&
            (!selectorAfterLabelSelector ||
              selector.labelMap.location.max > selectorAfterLabelSelector.labelMap!.location.max)
          ) {
            selectorAfterLabelSelector = selector;
          }
        }

        if (parent?.type === 'grouping' && node.type === 'identifier') {
          groupingAtCursor = true;
          groupingLabelComplete = true;
        }

        if (node.type === 'grouping') {
          const grouping = node as {
            location: { min: number; max: number };
            args: unknown[];
          };

          if (isCursorInsideGrouping(relativeCursor, grouping)) {
            groupingAtCursor = true;

            if (!groupingLabelComplete) {
              const trailingIdentifier = getTrailingIdentifier(textBeforeCursorTrimmed);
              groupingLabelComplete = trailingIdentifier !== undefined;
            }
          }
        }
      },
    });
  }

  const functionAtCursor = [position.node, position.parent].find(
    (node) => node?.type === 'function'
  );
  const lastChar = textBeforeCursorTrimmed.at(-1);

  return {
    text,
    textBeforeCursorTrimmed,
    start,
    root,
    relativeCursor,
    position,
    innermostFunction,
    nearestAggregation,
    functionAtCursor,
    selectorAfterMetric,
    selectorAfterLabelSelector,
    groupingAtCursor,
    groupingLabelComplete,
    lastChar,
  };
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
  const logicalCursor = ctx.textBeforeCursorTrimmed.length;
  if (logicalCursor === 0) {
    return false;
  }

  return ctx.nearestAggregation?.location.max === logicalCursor - 1;
}

// ============================================================================
// Function Argument Helpers
// ============================================================================

/** Determines position when cursor is after the last complete arg in a function. */
function getPositionAfterCompleteArg(
  ctx: PromQLQueryContext,
  func: PromQLFunction,
  signatureTypes: PromQLFunctionParamType[]
): PromqlPosition | undefined {
  if (func.args.length === 0) {
    return undefined;
  }

  const lastArg = func.args[func.args.length - 1];
  if (lastArg.incomplete || ctx.relativeCursor <= lastArg.location.max) {
    return undefined;
  }

  const maxParams = getMaxParamsForFunction(func.name);
  if (!maxParams || ctx.lastChar === ',') {
    return { type: 'inside_function_args', signatureTypes };
  }

  const paramIndex = computeParamIndexFromArgs(func, ctx.relativeCursor, ctx.text);

  return {
    type: 'after_complete_arg',
    canSuggestCommaInFunctionArgs: paramIndex < maxParams - 1,
    signatureTypes,
  };
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
    if (arg.incomplete) {
      continue;
    }

    const argText = ctx.text.slice(arg.location.min, arg.location.max + 1);
    const trimmedLength = argText.trimEnd().length;
    if (trimmedLength === 0) {
      continue;
    }

    const effectiveMax = arg.location.min + trimmedLength - 1;
    if (
      relativeCursor >= arg.location.min &&
      relativeCursor <= effectiveMax &&
      within(relativeCursor, { ...arg, location: { min: arg.location.min, max: effectiveMax } })
    ) {
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

// ============================================================================
// Function Resolution
// ============================================================================

function resolveSignatureTypesFromCtx(ctx: PromQLQueryContext): PromQLFunctionParamType[] {
  const functionNode = ctx.functionAtCursor ?? ctx.innermostFunction;

  if (!functionNode) {
    const textFallback = getTextBasedFunctionFallback(ctx.text, ctx.relativeCursor);
    if (!textFallback) {
      return [];
    }

    return getPromqlParamTypesForFunction(textFallback.name, textFallback.paramIndex);
  }

  const textFallback =
    functionNode.args.length === 0
      ? getTextBasedFunctionFallback(ctx.text, ctx.relativeCursor)
      : undefined;

  let paramIndex =
    functionNode.args.length > 0
      ? computeParamIndexFromArgs(functionNode, ctx.relativeCursor, ctx.text)
      : textFallback?.paramIndex ?? 0;

  const maxParams = getMaxParamsForFunction(functionNode.name);
  if (maxParams !== undefined && paramIndex >= maxParams) {
    paramIndex = maxParams - 1;
  }

  return getPromqlParamTypesForFunction(functionNode.name, paramIndex);
}

/**
 * Computes param index by walking function args and comparing cursor position.
 * Smart clamping: when cursor is past the last arg but no comma follows it,
 * stays on the current param (e.g., `rate(metric{job="a,b"} |)` → param 0).
 */
function computeParamIndexFromArgs(
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
    if (!textBetween.includes(',')) {
      return args.length - 1;
    }
  }

  return index;
}

/** Text-based function detection: finds function name and param index by counting commas. */
function getTextBasedFunctionFallback(
  text: string,
  cursor: number
): { name: string; paramIndex: number } | undefined {
  const beforeCursor = text.slice(0, cursor);
  const openParenIndex = beforeCursor.lastIndexOf('(');
  if (openParenIndex === -1) {
    return undefined;
  }

  const beforeParen = beforeCursor.slice(0, openParenIndex).trimEnd();
  const name = getTrailingIdentifier(beforeParen);
  if (!name) {
    return undefined;
  }

  const argsText = beforeCursor.slice(openParenIndex + 1);
  const paramIndex = argsText.split(',').length - 1;

  return { name, paramIndex };
}

// ============================================================================
// Param Text Helpers
// ============================================================================

/**
 * Detects if cursor is inside an open paren that starts a query context.
 * Handles cases like "PROMQL (" or "PROMQL col0 = (" where the AST doesn't
 * have a query node yet because the content is empty.
 */
function isInsideQueryParen(commandText: string): boolean {
  const trimmed = commandText.trimEnd();
  if (!trimmed.endsWith('(') && !trimmed.endsWith('= (')) {
    return false;
  }

  return getBracketsToClose(trimmed).includes(')');
}

/** Extracts the trailing identifier from text (e.g., "start" from "end=value start"). */
function getTrailingIdentifier(text: string): string | undefined {
  const match = text.match(TRAILING_PARAM_NAME_REGEX);
  return match ? match[1] : undefined;
}

/** Extracts trailing identifier if it's a known PROMQL param name. */
function getTrailingPromqlParamName(text: string): string | undefined {
  const identifier = getTrailingIdentifier(text.trimEnd())?.toLowerCase();
  return identifier && isPromqlParamName(identifier) ? identifier : undefined;
}

/** Identifies a param assignment in progress (e.g., "step=") to suggest values. */
function getIncompleteParamFromText(text: string): string | undefined {
  const trimmed = text.trimEnd();
  if (!trimmed.endsWith('=')) {
    return undefined;
  }
  return getTrailingPromqlParamName(trimmed.slice(0, -1));
}

/** Detects "param name + space" pattern (e.g., "step ") to suggest "=". */
function isAfterParamKeyword(text: string): boolean {
  return text.endsWith(' ') && getTrailingPromqlParamName(text) !== undefined;
}

/*
 * Extracts the PromQL query text and start position from the command.
 * Uses full commandText (up to pipe) so the PromQL parser gets balanced parentheses.
 * Returns the start position to convert absolute cursor to relative for AST comparison.
 */
function getPromqlQuerySlice(
  command: ESQLAstPromqlCommand,
  commandText: string
): { text: string; start: number; originalLength: number } | undefined {
  const queryNode = command.query;
  if (!queryNode) {
    return undefined;
  }

  const { queryLocation } = getPromqlQueryLocations(queryNode);
  if (!queryLocation) {
    return undefined;
  }

  const { min } = queryLocation;
  if (min < 0) {
    return undefined;
  }

  // commandText starts at command.location.min, so convert to relative position
  const commandStart = command.location.min;
  const relativeMin = min - commandStart;
  const rawText = commandText.slice(relativeMin).trimEnd();

  if (rawText.length === 0) {
    return undefined;
  }

  const text = correctPromqlQuerySyntax(rawText);

  // Return original length to clamp cursor (cursor shouldn't appear on added brackets)
  return { text, start: min, originalLength: rawText.length };
}

function getPromqlQueryLocations(queryNode: ESQLAstPromqlCommand['query']): {
  queryLocation?: { min: number; max: number };
  wrappedParens?: { min: number; max: number };
} {
  if (!queryNode) {
    return {};
  }

  const assignmentLocs = extractAssignmentLocations(queryNode);

  return {
    queryLocation: assignmentLocs?.inner ?? queryNode.location,
    wrappedParens:
      assignmentLocs?.outer ?? (queryNode.type === 'parens' ? queryNode.location : undefined),
  };
}

/** Extracts inner and outer locations from `col=(query)` assignment. */
function extractAssignmentLocations(node: NonNullable<ESQLAstPromqlCommand['query']>):
  | {
      inner: { min: number; max: number };
      outer: { min: number; max: number };
    }
  | undefined {
  // The ES|QL parser wraps `col=(query)` as a binary-expression with parens child.
  if (!('subtype' in node) || node.subtype !== 'binary-expression') {
    return undefined;
  }

  const args = 'args' in node ? (node.args as unknown[]) : [];
  const rhsNode = !Array.isArray(args[1]) ? (args[1] as Record<string, unknown>) : undefined;

  if (!rhsNode || rhsNode.type !== 'parens' || !('child' in rhsNode)) {
    return undefined;
  }

  const inner = (rhsNode.child as { location?: { min: number; max: number } })?.location;
  const outer = (rhsNode as { location?: { min: number; max: number } }).location;

  return inner && outer ? { inner, outer } : undefined;
}
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

export const PROMQL_PARAMS: PromqlParamDefinition[] = [
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

export function getPromqlParam(name: string): PromqlParamDefinition | undefined {
  return PROMQL_PARAMS.find((param) => param.name === name);
}

export function areRequiredPromqlParamsPresent(usedParams: Set<string>): boolean {
  return PROMQL_REQUIRED_PARAMS.every((param) => usedParams.has(param));
}

export const isPromqlParamName = (name: string): boolean => PROMQL_PARAM_NAMES.includes(name);

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

  return PROMQL_PARAM_NAMES.some(
    (param) =>
      trimmed === param ||
      (trimmed.startsWith(param) && trimmed.substring(param.length).trimStart().startsWith('='))
  );
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
  const firstToken = fullQuery
    .substring(cursorPosition)
    .trimStart()
    .split(/\s/, 1)[0]
    ?.toLowerCase();
  if (!firstToken || isPromqlParamName(firstToken)) {
    return false;
  }

  const assignmentKey = firstToken.split('=')[0];
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
    return firstToken.startsWith('?_t') || firstToken.startsWith('"') || firstToken.startsWith("'");
  }

  if (definition.valueType === PromqlParamValueType.TimeseriesSources) {
    return !firstToken.includes('=') && !firstToken.includes('(');
  }

  return true;
}

/* Avoids suggesting a column assignment when the cursor is directly before a param token. */
export function isAtValidColumnSuggestionPosition(
  fullCommandText: string,
  cursorPosition: number
): boolean {
  const keyPart = fullCommandText
    .substring(cursorPosition)
    .trimStart()
    .split(/\s/, 1)[0]
    ?.split('=')[0]
    ?.toLowerCase();
  return !keyPart || !isPromqlParamName(keyPart);
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

  if (key.toLowerCase() !== PromqlParamName.Index) {
    return undefined;
  }

  const afterEquals = commandText.slice(equalsIndex + 1);
  const valueStart = equalsIndex + 1 + (afterEquals.length - afterEquals.trimStart().length);

  return { valueText: commandText.slice(valueStart), valueStart };
}
