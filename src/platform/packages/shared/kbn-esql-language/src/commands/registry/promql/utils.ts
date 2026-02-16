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
import { countTopLevelCommas } from '../../definitions/utils/shared';
import { PromQLParser } from '../../../embedded_languages/promql';
import type {
  PromQLAstNode,
  PromQLAstQueryExpression,
  PromQLFunction,
  PromQLLabel,
  PromQLSelector,
} from '../../../embedded_languages/promql/types';
import {
  getPromqlFunctionDefinition,
  getPromqlParamTypesForFunction,
  isPromqlAcrossSeriesFunction,
} from '../../definitions/utils/promql';
import type { PromQLFunctionParamType } from '../../definitions/types';
import { PromqlWalker } from '../../../embedded_languages/promql/ast/walker';

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
  currentParam?: string; // param name being edited (e.g. 'step' for after_param_equals)
  canAddGrouping?: boolean; // whether by/without can be appended to the the query
  selector?: PromQLSelector; // selector node at cursor (for duration/label checks)
  canSuggestRangeSelector?: boolean; // whether [5m] range selector can be suggested
  isCompleteLabel?: boolean; // label at cursor is complete (suggest comma instead of new label)
  canSuggestCommaInFunctionArgs?: boolean; // whether comma can be suggested between function args
  signatureTypes?: PromQLFunctionParamType[]; // expected param types for current function arg position
}

// Shared identifier pattern for param names, column names, etc.
export const IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';

// Param zone detection
const TRAILING_PARAM_NAME_REGEX = new RegExp(`(${IDENTIFIER_PATTERN})\\s*$`);
const FUNCTION_ARG_START_TOKENS = ['(', ','];
const TOKEN_SPLIT_WHITESPACE_REGEX = /\s/;
const TRAILING_COMMA_WITH_SPACES_REGEX = /,\s*$/;
const SELECTOR_DURATION_START_REGEX = /^\s*\[$/;
const LABEL_ENTRY_ALLOWED_NEXT_CHAR_REGEX = /[A-Za-z0-9_,"'}\s]/;

// ============================================================================
// Main Entry Point
// ============================================================================

export function getPosition(
  innerText: string,
  command: ESQLAstAllCommands,
  commandText: string | undefined
): PromqlPosition {
  const cursorPosition = innerText.length;
  const promqlCommand = command as ESQLAstPromqlCommand;
  const innerCommandText = innerText.substring(promqlCommand.location.min);

  // Parse query slice for cursor-first resolution
  const querySlice = commandText ? getPromqlQuerySlice(promqlCommand, commandText) : undefined;

  const queryZonePosition = getQueryZonePosition(
    innerText,
    cursorPosition,
    promqlCommand,
    querySlice
  );

  if (queryZonePosition) {
    return queryZonePosition;
  }

  if (commandText && isInsideQueryParen(commandText)) {
    return { type: 'after_open_paren' };
  }

  return getParamZonePosition(innerCommandText);
}

// ============================================================================
// Query zone detection (AST-based)
// ============================================================================

interface QuerySlice {
  text: string;
  start: number;
  originalLength: number;
}

/**
 * Uses AST query location to decide whether the cursor is in/after the query.
 * We keep this separate to avoid misclassifying param edits as query edits.
 */
function getQueryZonePosition(
  innerText: string,
  cursorPosition: number,
  promqlCommand: ESQLAstPromqlCommand,
  querySlice?: QuerySlice
): PromqlPosition | undefined {
  const queryNode = promqlCommand.query;
  const queryBounds = getPromqlQueryBounds(queryNode);

  if (!queryBounds || !isQueryLocationUsable(innerText, queryBounds)) {
    return undefined;
  }

  // Parse PromQL AST from the query slice (lazy — only when needed for inside-query)
  const parseQueryAst = (): { root: PromQLAstQueryExpression; cursor: number } | undefined => {
    if (!querySlice) {
      return undefined;
    }

    const { text, start, originalLength } = querySlice;
    const { root } = PromQLParser.parse(text);
    const relativeCursor = Math.min(cursorPosition - start, originalLength);

    return { root, cursor: relativeCursor };
  };

  // Computes canAddGrouping from the parsed AST
  const computeCanAddGrouping = (): boolean => {
    const parsed = parseQueryAst();

    if (!parsed) {
      return false;
    }

    const { root, cursor } = parsed;
    const textBeforeCursor = querySlice!.text.slice(0, cursor).trimEnd();
    const logicalCursor = textBeforeCursor.length;

    if (logicalCursor === 0) {
      return false;
    }

    const nearest = findNearestAggregation(root, logicalCursor);

    return nearest?.location.max === logicalCursor - 1;
  };

  // Zone 1: cursor past everything (including wrapper parens if any)
  if (cursorPosition > (queryBounds.wrappedEnd ?? queryBounds.queryEnd)) {
    const canAddGrouping = queryBounds.wrappedEnd === undefined && computeCanAddGrouping();

    return { type: 'after_query', canAddGrouping };
  }

  // Zone 2: cursor between inner expression and outer parens wrapper
  if (queryBounds.wrappedEnd !== undefined && cursorPosition > queryBounds.queryEnd) {
    return { type: 'inside_query', canAddGrouping: computeCanAddGrouping() };
  }

  // Inside query zone: delegate to cursor-first resolver
  if (queryNode && within(cursorPosition, queryNode)) {
    const parsed = parseQueryAst();

    if (parsed) {
      return getQueryPosition(parsed.root, parsed.cursor, querySlice!.text);
    }

    return { type: 'inside_query', canAddGrouping: false };
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
    return {
      type: 'after_param_equals',
      currentParam: incompleteParam,
    };
  }

  if (isAfterParamKeyword(commandText)) {
    return { type: 'after_param_keyword' };
  }

  return { type: 'after_command' };
}

function getPositionFromLabel(label: PromQLLabel): PromqlPosition | undefined {
  if (!label.value) {
    return label.incomplete ? { type: 'after_label_operator' } : { type: 'after_label_name' };
  }

  return { type: 'after_label_brace', isCompleteLabel: true };
}

/**
 * Guards against the parser misclassifying params as the query.
 * Rejects invalid query locations (e.g., `PROMQL step` where "step" ends up in query.text).
 */
function isQueryLocationUsable(
  innerText: string,
  queryBounds: PromqlQueryBounds | undefined
): boolean {
  if (!queryBounds || queryBounds.queryEnd === queryBounds.queryStart) {
    return false;
  }

  const queryText = innerText.substring(queryBounds.queryStart, queryBounds.queryEnd + 1).trim();

  // Reject if empty or looks like a param assignment
  return queryText !== '' && !looksLikePromqlParamAssignment(queryText);
}

// ============================================================================
// Cursor-First Node Resolution
// ============================================================================

interface CursorMatch {
  node: PromQLAstNode;
  parent: PromQLAstNode | undefined;
}

interface CursorContext {
  match: CursorMatch | undefined;
  innermostFunc: PromQLFunction | undefined;
}

/** Single walker pass: finds narrowest node at cursor AND innermost function containing cursor. */
function findCursorContext(root: PromQLAstQueryExpression, cursor: number): CursorContext {
  let match: CursorMatch | undefined;
  let innermostFunc: PromQLFunction | undefined;

  if (!root.expression) {
    return { match: undefined, innermostFunc: undefined };
  }

  PromqlWalker.walk(root, {
    visitPromqlAny: (node, parent) => {
      const containsCursor =
        within(cursor, node) || (node.incomplete && cursor > node.location.max);

      if (!containsCursor) {
        return;
      }

      const span = node.location.max - node.location.min;
      const matchSpan = match ? match.node.location.max - match.node.location.min : Infinity;

      if (span <= matchSpan) {
        match = { node, parent: parent as PromQLAstNode | undefined };
      }

      if (node.type === 'function' && within(cursor, node)) {
        const funcSpan = innermostFunc
          ? innermostFunc.location.max - innermostFunc.location.min
          : Infinity;

        if (span <= funcSpan) {
          innermostFunc = node as PromQLFunction;
        }
      }
    },
  });

  return { match, innermostFunc };
}

// ============================================================================
// Cursor-First Shared Helpers
// ============================================================================

/** Walks the AST to find the closest completed aggregation before the cursor. */
function findNearestAggregation(
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

/** Resolves signature types by walking up to the enclosing function. */
function getSignatureTypesFromAncestors(
  text: string,
  cursor: number,
  innermostFunc?: PromQLFunction,
  funcAtCursor?: PromQLAstNode
): PromQLFunctionParamType[] {
  const functionNode = innermostFunc ?? (funcAtCursor as PromQLFunction | undefined);

  // No AST function: use text-only cursor-local detection
  if (!functionNode) {
    const cursorLocalFunc = getTextBasedFunctionContext(text, cursor);

    if (!cursorLocalFunc) {
      return [];
    }

    return getPromqlParamTypesForFunction(cursorLocalFunc.name, cursorLocalFunc.paramIndex);
  }

  // AST-aware param index (using function's location for paren search)
  const functionTextContext = getTextBasedFunctionContext(text, cursor, functionNode);

  // Name-mismatch check: cursor-local may see a different (nested) function
  const cursorLocalFunc = getTextBasedFunctionContext(text, cursor);

  if (cursorLocalFunc && cursorLocalFunc.name !== functionNode.name) {
    return getPromqlParamTypesForFunction(cursorLocalFunc.name, cursorLocalFunc.paramIndex);
  }

  const localFallback = functionNode.args.length === 0 ? cursorLocalFunc : undefined;

  let paramIndex =
    functionTextContext?.paramIndex ??
    (functionNode.args.length > 0
      ? computeParamIndexFromArgs(functionNode, cursor, text)
      : localFallback?.paramIndex ?? 0);

  const maxParams = getMaxParamsForFunction(functionNode.name);

  if (maxParams !== undefined && paramIndex >= maxParams) {
    paramIndex = maxParams - 1;
  }

  return getPromqlParamTypesForFunction(functionNode.name, paramIndex);
}

/** Finds selector args inside a function where cursor is past the selector's metric or labels. */
function findSelectorArgPosition(
  func: PromQLFunction,
  cursor: number,
  textBeforeCursor: string,
  signatureTypes: PromQLFunctionParamType[]
): PromqlPosition | undefined {
  for (const arg of func.args) {
    if (arg.type !== 'selector') {
      continue;
    }

    const selector = arg as PromQLSelector;

    // After metric, no labels/duration yet
    if (
      selector.metric &&
      !selector.labelMap &&
      !selector.duration &&
      cursor > selector.metric.location.max
    ) {
      return { type: 'after_metric', selector, signatureTypes };
    }

    // After closed label map, no duration yet
    if (
      selector.labelMap &&
      !selector.duration &&
      cursor > selector.labelMap.location.max &&
      textBeforeCursor.slice(selector.labelMap.location.min, cursor).includes('}')
    ) {
      return {
        type: 'after_label_selector',
        selector,
        canSuggestRangeSelector: true,
        signatureTypes,
      };
    }
  }

  return undefined;
}

/** Checks if cursor is after a complete top-level expression with trailing space. */
function isAfterCompleteExpression(root: PromQLAstQueryExpression, cursor: number): boolean {
  const expr = root.expression;

  if (!expr || expr.incomplete) {
    return false;
  }

  if (expr.type !== 'function' && expr.type !== 'parens') {
    return false;
  }

  return cursor > expr.location.max + 1;
}

// ============================================================================
// Domain Resolvers
// ============================================================================

/**
 * Resolves cursor position within a label map context ({labels}).
 * Note: label text fallback already checked by caller (getQueryPosition).
 */
function resolveLabelPosition(
  match: CursorMatch,
  cursor: number,
  textBeforeCursor: string,
  signatureTypes: PromQLFunctionParamType[]
): PromqlPosition | undefined {
  const { node, parent } = match;

  // Find the selector that owns this label context
  const selectorNode =
    node.type === 'selector'
      ? (node as PromQLSelector)
      : parent?.type === 'selector'
      ? (parent as PromQLSelector)
      : undefined;

  // Cursor between closed labelMap and range selector start
  if (
    selectorNode?.labelMap &&
    selectorNode.duration &&
    cursor <= selectorNode.duration.location.min &&
    cursor > selectorNode.labelMap.location.max &&
    textBeforeCursor.slice(selectorNode.labelMap.location.min, cursor).includes('}')
  ) {
    return {
      type: 'after_label_selector',
      selector: selectorNode,
      canSuggestRangeSelector: true,
      signatureTypes,
    };
  }

  // Inside label-map node but not on a specific label
  if (node.type === 'label-map') {
    if (cursor <= node.location.min) {
      return undefined;
    }

    return { type: 'after_label_brace' };
  }

  // After comma inside label-map
  const lastChar = textBeforeCursor.trimEnd().at(-1);

  if (lastChar === ',' && (parent?.type === 'label-map' || parent?.type === 'label')) {
    return { type: 'after_label_brace' };
  }

  // Identifier inside label-map (incomplete label name)
  if (parent?.type === 'label-map' && node.type === 'identifier') {
    return { type: 'after_label_name' };
  }

  // Inside a parsed label node
  let labelNode: PromQLLabel | undefined;

  if (parent?.type === 'label') {
    labelNode = parent as PromQLLabel;
  } else if (parent?.type === 'label-map' && node.type === 'label') {
    labelNode = node as PromQLLabel;
  }

  if (labelNode) {
    return getPositionFromLabel(labelNode);
  }

  return undefined;
}

/** Text fallback for label maps where the AST is unreliable. */
function getLabelMapTextFallbackPosition(text: string, cursor: number): PromqlPosition | undefined {
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

  const leadingIdentifierMatch = trimmedEntryBeforeCursor.match(
    new RegExp(`^(${IDENTIFIER_PATTERN})(.*)$`)
  );

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

  const firstTailChar = tailAfterIdentifier[0];

  if (!firstTailChar || firstTailChar === '"' || firstTailChar === "'") {
    return undefined;
  }

  return { type: 'after_label_operator' };
}

/** Resolves cursor position inside a grouping clause (by/without). */
function resolveGroupingPosition(
  cursor: number,
  text: string,
  groupingNode: { location: { min: number; max: number }; args: unknown[] }
): PromqlPosition | undefined {
  if (!isCursorInsideGrouping(cursor, groupingNode)) {
    return undefined;
  }

  if (text.slice(0, cursor).trimEnd().endsWith(',')) {
    return { type: 'inside_grouping', isCompleteLabel: false };
  }

  const isComplete = hasGroupingTrailingIdentifier(text, cursor, groupingNode.location.min);

  return { type: 'inside_grouping', isCompleteLabel: isComplete };
}

/** Resolves cursor position within a selector (metric, labels, range). */
function resolveSelectorPosition(
  selector: PromQLSelector,
  cursor: number,
  textBeforeCursor: string,
  signatureTypes: PromQLFunctionParamType[]
): PromqlPosition | undefined {
  const { metric, labelMap } = selector;

  // Cursor after metric, before labelMap → after_metric
  if (metric && cursor > metric.location.max && (!labelMap || cursor < labelMap.location.min)) {
    return { type: 'after_metric', selector };
  }

  if (!labelMap) {
    return undefined;
  }

  if (cursor < labelMap.location.min) {
    return undefined;
  }

  if (labelMap.args.length === 0) {
    return { type: 'after_label_brace' };
  }

  const firstLabel = labelMap.args[0];

  if (cursor <= firstLabel.location.min) {
    return { type: 'after_label_brace' };
  }

  const lastLabel = labelMap.args[labelMap.args.length - 1];
  const lastChar = textBeforeCursor.trimEnd().at(-1);

  if (lastChar === ',') {
    return { type: 'after_label_brace' };
  }

  if (lastLabel.incomplete && !lastLabel.value) {
    if (lastLabel.labelName.incomplete) {
      return { type: 'after_label_brace' };
    }

    return { type: 'after_label_operator' };
  }

  // Closed label map: cursor past last label means we're after `}`
  if (
    !labelMap.incomplete &&
    cursor > lastLabel.location.max &&
    textBeforeCursor.slice(labelMap.location.min, cursor).includes('}')
  ) {
    const canSuggestRangeSelector = !selector.duration || cursor <= selector.duration.location.min;

    return {
      type: 'after_label_selector',
      selector,
      canSuggestRangeSelector,
      signatureTypes,
    };
  }

  const labelPosition = getPositionFromLabel(lastLabel);

  if (labelPosition) {
    return labelPosition;
  }

  // Incomplete label map (no closing `}`)
  if (labelMap.incomplete) {
    return { type: 'after_label_brace' };
  }

  return undefined;
}

/** Resolves cursor position within function arguments. */
function resolveFunctionPosition(
  func: PromQLFunction,
  cursor: number,
  text: string,
  signatureTypes: PromQLFunctionParamType[],
  textBeforeCursor: string
): PromqlPosition | undefined {
  const lastChar = textBeforeCursor.at(-1);

  // At arg boundary (after `(` or `,`)
  if (isAtFunctionArgStart(text, cursor, func)) {
    const maxParams = getMaxParamsForFunction(func.name);

    if (
      maxParams !== undefined &&
      func.args.length >= maxParams &&
      !func.args.some((arg) => arg.location.min >= cursor)
    ) {
      return undefined;
    }

    return { type: 'inside_function_args', signatureTypes };
  }

  // Within existing arg
  for (const arg of func.args) {
    if (arg.incomplete) {
      continue;
    }

    const argText = text.slice(arg.location.min, arg.location.max + 1);
    const trimmedLength = argText.trimEnd().length;

    if (trimmedLength === 0) {
      continue;
    }

    const effectiveMax = arg.location.min + trimmedLength - 1;

    if (cursor >= arg.location.min && cursor <= effectiveMax) {
      return { type: 'inside_function_args', signatureTypes };
    }
  }

  // After last complete arg
  if (func.args.length === 0) {
    return undefined;
  }

  const lastArg = func.args[func.args.length - 1];

  if (lastArg.incomplete || cursor <= lastArg.location.max) {
    return undefined;
  }

  if (cursor > func.location.max + 1) {
    return undefined;
  }

  const textAfterLastArg = text.slice(lastArg.location.max + 1, cursor);

  if (textAfterLastArg.includes(')')) {
    return undefined;
  }

  // Selector duration continuation
  if (
    lastArg.type === 'selector' &&
    SELECTOR_DURATION_START_REGEX.test(text.slice(lastArg.location.max + 1, cursor + 1))
  ) {
    if (lastArg.labelMap) {
      return {
        type: 'after_label_selector',
        selector: lastArg,
        canSuggestRangeSelector: true,
        signatureTypes,
      };
    }

    return { type: 'inside_query', canAddGrouping: false };
  }

  // Closed selector without duration yet
  if (
    lastArg.type === 'selector' &&
    lastArg.labelMap &&
    !lastArg.duration &&
    textBeforeCursor.slice(lastArg.labelMap.location.min, cursor).includes('}')
  ) {
    return {
      type: 'after_label_selector',
      selector: lastArg,
      canSuggestRangeSelector: true,
      signatureTypes,
    };
  }

  // Range vector fallback after malformed label matchers
  if (signatureTypes.includes('range_vector')) {
    if (textAfterLastArg.includes('}') && !textAfterLastArg.includes('[')) {
      return {
        type: 'after_label_selector',
        canSuggestRangeSelector: true,
        signatureTypes,
      };
    }
  }

  const maxParams = getMaxParamsForFunction(func.name);

  if (!maxParams || lastChar === ',') {
    return { type: 'inside_function_args', signatureTypes };
  }

  const paramIndex = computeParamIndexFromArgs(func, cursor, text);

  return {
    type: 'after_complete_arg',
    canSuggestCommaInFunctionArgs: paramIndex < maxParams - 1,
    signatureTypes,
  };
}

/** Checks if cursor is at an argument boundary in a function. */
function isAtFunctionArgStart(text: string, cursor: number, func: PromQLFunction): boolean {
  const { min, max } = func.location;
  const clampedCursor = Math.min(Math.max(cursor, min), max + 1);
  const beforeCursor = text.slice(min, clampedCursor).trimEnd();

  if (beforeCursor.length === 0) {
    return false;
  }

  const lastChar = beforeCursor[beforeCursor.length - 1];

  return lastChar !== undefined && FUNCTION_ARG_START_TOKENS.includes(lastChar);
}

/** Resolves top-level position (after/inside query). */
function resolveTopLevelPosition(
  root: PromQLAstQueryExpression,
  cursor: number,
  text: string,
  precomputedCanAddGrouping?: boolean,
  textBeforeCursorArg?: string
): PromqlPosition {
  if (precomputedCanAddGrouping !== undefined) {
    return { type: 'inside_query', canAddGrouping: precomputedCanAddGrouping };
  }

  const textBeforeCursor = textBeforeCursorArg ?? text.slice(0, cursor).trimEnd();
  const logicalCursor = textBeforeCursor.length;
  const nearest = findNearestAggregation(root, logicalCursor);
  const canAddGrouping = logicalCursor > 0 && nearest?.location.max === logicalCursor - 1;

  return { type: 'inside_query', canAddGrouping };
}

// ============================================================================
// Cursor-First Entry Point
// ============================================================================

/** Routes cursor to the appropriate domain resolver based on deepest AST node. */
function getQueryPosition(
  root: PromQLAstQueryExpression,
  cursor: number,
  text: string
): PromqlPosition {
  const textBeforeCursor = text.slice(0, cursor).trimEnd();
  const lastChar = textBeforeCursor.at(-1);
  const { match, innermostFunc } = findCursorContext(root, cursor);
  const funcAtCursor = match
    ? [match.node, match.parent].find((n) => n?.type === 'function')
    : undefined;

  // Lazy: many paths (label fallback, grouping, top-level) never need signature types
  let cachedSignatureTypes: PromQLFunctionParamType[] | undefined;
  const getSignatureTypes = (): PromQLFunctionParamType[] => {
    if (cachedSignatureTypes === undefined) {
      cachedSignatureTypes = getSignatureTypesFromAncestors(
        text,
        cursor,
        innermostFunc,
        funcAtCursor
      );
    }

    return cachedSignatureTypes;
  };

  // Text fallback for incomplete label maps (before AST routing — parser may not build label nodes)
  const labelTextFallback = getLabelMapTextFallbackPosition(text, cursor);

  if (labelTextFallback) {
    return labelTextFallback;
  }

  if (!match) {
    // No AST node at cursor — check for open paren / equals fallback
    if (lastChar === '(' || lastChar === '=') {
      return { type: 'after_open_paren', signatureTypes: getSignatureTypes() };
    }

    return resolveTopLevelPosition(root, cursor, text, undefined, textBeforeCursor);
  }

  const { node, parent } = match;

  // Label context: node or parent is label-related
  const inLabelContext =
    node.type === 'label-map' ||
    node.type === 'label' ||
    parent?.type === 'label-map' ||
    parent?.type === 'label';

  if (inLabelContext) {
    // Skip label when at comma boundary inside function args (label vs function conflict)
    const skipLabel =
      node.type === 'identifier' &&
      parent?.type === 'label-map' &&
      innermostFunc &&
      TRAILING_COMMA_WITH_SPACES_REGEX.test(textBeforeCursor);

    if (!skipLabel) {
      const labelPos = resolveLabelPosition(match, cursor, textBeforeCursor, getSignatureTypes());

      if (labelPos) {
        return labelPos;
      }
    }
  }

  // Grouping context
  if (node.type === 'grouping' || parent?.type === 'grouping') {
    const groupingNode = (node.type === 'grouping' ? node : parent) as {
      location: { min: number; max: number };
      args: unknown[];
    };
    const groupingPos = resolveGroupingPosition(cursor, text, groupingNode);

    if (groupingPos) {
      // Check if identifier in grouping is complete
      if (parent?.type === 'grouping' && node.type === 'identifier' && within(cursor, node)) {
        return { type: 'inside_grouping', isCompleteLabel: true };
      }

      return groupingPos;
    }
  }

  // Selector context: also triggers when cursor is on metric identifier inside selector
  const selectorNode =
    node.type === 'selector'
      ? (node as PromQLSelector)
      : parent?.type === 'selector'
      ? (parent as PromQLSelector)
      : undefined;

  if (selectorNode) {
    const selectorPos = resolveSelectorPosition(
      selectorNode,
      cursor,
      textBeforeCursor,
      getSignatureTypes()
    );

    if (selectorPos) {
      return selectorPos;
    }

    // Cursor on metric identifier: use after_metric when at or past metric end
    if (
      selectorNode.metric &&
      cursor >= selectorNode.metric.location.max &&
      (!selectorNode.labelMap || cursor < selectorNode.labelMap.location.min)
    ) {
      return { type: 'after_metric', selector: selectorNode, signatureTypes: getSignatureTypes() };
    }
  }

  // Check selector args inside functions (cursor past selector metric/labels but not on selector node)
  if (innermostFunc && within(cursor, innermostFunc)) {
    const selectorArgPos = findSelectorArgPosition(
      innermostFunc,
      cursor,
      textBeforeCursor,
      getSignatureTypes()
    );

    if (selectorArgPos) {
      return selectorArgPos;
    }
  }

  // canAddGrouping takes precedence over function args (matches old priority chain)
  const logicalCursor = textBeforeCursor.length;
  const nearestAgg = findNearestAggregation(root, logicalCursor);
  const canAddGrouping = logicalCursor > 0 && nearestAgg?.location.max === logicalCursor - 1;

  if (canAddGrouping || isAfterCompleteExpression(root, cursor)) {
    return { type: 'inside_query', canAddGrouping };
  }

  // Function context
  if (innermostFunc) {
    const funcPos = resolveFunctionPosition(
      innermostFunc,
      cursor,
      text,
      getSignatureTypes(),
      textBeforeCursor
    );

    if (funcPos) {
      return funcPos;
    }
  }

  // Range selector fallback: after `}` when expecting range_vector
  if (getSignatureTypes().includes('range_vector') && textBeforeCursor.endsWith('}')) {
    return {
      type: 'after_label_selector',
      canSuggestRangeSelector: true,
      signatureTypes: getSignatureTypes(),
    };
  }

  // After-expression fallback (open paren or equals at end)
  if (lastChar === '(' || lastChar === '=') {
    return { type: 'after_open_paren', signatureTypes: getSignatureTypes() };
  }

  return resolveTopLevelPosition(root, cursor, text, canAddGrouping, textBeforeCursor);
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

function hasGroupingTrailingIdentifier(
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

/** Uses function definitions to bound how many arguments can be suggested. */
function getMaxParamsForFunction(name: string): number | undefined {
  const definition = getPromqlFunctionDefinition(name);
  if (!definition) {
    return undefined;
  }

  return Math.max(...definition.signatures.map((signature) => signature.params.length));
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

    if (countTopLevelCommas(textBetween, 0, textBetween.length) === 0) {
      return args.length - 1;
    }
  }

  return index;
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

  const queryBounds = getPromqlQueryBounds(queryNode);
  if (!queryBounds) {
    return undefined;
  }

  if (queryBounds.queryStart < 0) {
    return undefined;
  }

  // commandText starts at command.location.min, so convert to relative position
  const commandStart = command.location.min;
  const relativeMin = queryBounds.queryStart - commandStart;
  const rawText = commandText.slice(relativeMin).trimEnd();

  if (rawText.length === 0) {
    return undefined;
  }

  const text = correctPromqlQuerySyntax(rawText);

  // Return original length to clamp cursor (cursor shouldn't appear on added brackets)
  return { text, start: queryBounds.queryStart, originalLength: rawText.length };
}

interface PromqlQueryBounds {
  queryStart: number;
  queryEnd: number;
  wrappedEnd?: number;
}

function getPromqlQueryBounds(
  queryNode: ESQLAstPromqlCommand['query']
): PromqlQueryBounds | undefined {
  if (!queryNode) {
    return undefined;
  }

  const wrapped = extractWrappedLocations(queryNode);
  const queryLocation = wrapped?.inner ?? queryNode.location;

  return {
    queryStart: queryLocation.min,
    queryEnd: queryLocation.max,
    wrappedEnd: wrapped?.outer.max,
  };
}

/**
 * Extracts inner (child expression) and outer (parens wrapper) locations.
 * Handles both bare parens `(query)` and assignment `col0=(query)`.
 */
function extractWrappedLocations(
  node: NonNullable<ESQLAstPromqlCommand['query']>
): { inner: { min: number; max: number }; outer: { min: number; max: number } } | undefined {
  // Bare parens: (query) — node itself is a parens with a child
  if (node.type === 'parens' && 'child' in node) {
    const inner = (node.child as { location?: { min: number; max: number } })?.location;

    return inner ? { inner, outer: node.location } : undefined;
  }

  // Assignment: col0=(query) — binary-expression with parens RHS
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
    .split(TOKEN_SPLIT_WHITESPACE_REGEX, 1)[0]
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
    .split(TOKEN_SPLIT_WHITESPACE_REGEX, 1)[0]
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
