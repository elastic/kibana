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
import { correctPromqlQuerySyntax, getBracketsToClose } from '../../definitions/utils/ast';
import { getPreGroupedAggregationName } from '../../definitions/utils/promql';
import { getTrailingIdentifier } from '../../definitions/utils/shared';

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
  Buckets = 'buckets',
  ScrapeInterval = 'scrape_interval',
}

export interface PromqlParamDefinition {
  name: string;
  description: string;
  valueType: PromqlParamValueType;
  required?: boolean;
  suggestedValues?: string[];
}

// ============================================================================
// Types
// ============================================================================

type ParamPositionKind = 'after_command' | 'after_param_keyword' | 'after_param_equals';

export type PromqlMacroPosition =
  | {
      type: 'params';
      kind: ParamPositionKind;
      currentParam?: string;
      shouldWrap: boolean;
      preGroupedAgg?: string;
    }
  | {
      type: 'query';
      queryText: string;
      cursorRelative: number;
      shouldWrap: boolean;
    };

interface QuerySlice {
  text: string;
  start: number;
  originalLength: number;
}

interface PromqlQueryBounds {
  queryStart: number;
  queryEnd: number;
  wrappedEnd?: number;
}

// ============================================================================
// Constants
// ============================================================================

// Shared identifier pattern for param names, column names, etc.
export const IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';

const TOKEN_SPLIT_WHITESPACE_REGEX = /\s/;

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
  {
    name: PromqlParamName.Buckets,
    description: 'Number of time buckets (alternative to step)',
    valueType: PromqlParamValueType.Static,
  },
  {
    name: PromqlParamName.ScrapeInterval,
    description: 'Scrape interval for implicit range selector window (e.g. 1m)',
    valueType: PromqlParamValueType.Static,
  },
];

export const PROMQL_PARAM_NAMES: string[] = PROMQL_PARAMS.map(({ name }) => name);

const PARAM_ASSIGNMENT_PATTERNS = PROMQL_PARAM_NAMES.map((param) => ({
  param,
  pattern: new RegExp(`${param}\\s*=`, 'i'),
}));

// ============================================================================
// Query Slice Helpers
// ============================================================================

/*
 * Extracts the PromQL query text and start position from the command.
 * Uses full commandText (up to pipe) so the PromQL parser gets balanced parentheses.
 * Returns the start position to convert absolute cursor to relative for query analysis.
 */
function getPromqlQuerySlice(
  command: ESQLAstPromqlCommand,
  commandText: string,
  queryBounds: PromqlQueryBounds
): QuerySlice | undefined {
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

  // Keep original length to clamp cursor (cursor shouldn't appear on added brackets)
  return { text, start: queryBounds.queryStart, originalLength: rawText.length };
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
  // Bare parens: (query) - node itself is a parens with a child
  if (node.type === 'parens' && 'child' in node) {
    const inner = (node.child as { location?: { min: number; max: number } })?.location;

    return inner ? { inner, outer: node.location } : undefined;
  }

  // Assignment: col0=(query) - binary-expression with parens RHS
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

// ============================================================================
// Main Entry Point
// ============================================================================

export function getPosition(
  innerText: string,
  command: ESQLAstAllCommands,
  commandText: string | undefined
): PromqlMacroPosition {
  const cursorPosition = innerText.length;
  const promqlCommand = command as ESQLAstPromqlCommand;
  const innerCommandText = innerText.substring(promqlCommand.location.min);

  const preGroupedAgg = getPreGroupedAggregationName(innerCommandText);
  const shouldWrap = isAfterCustomColumnAssignment(innerCommandText) || !!preGroupedAgg;

  const queryBounds = getPromqlQueryBounds(promqlCommand.query);
  const querySlice =
    commandText && queryBounds
      ? getPromqlQuerySlice(promqlCommand, commandText, queryBounds)
      : undefined;

  const queryZone = getQueryZoneMacroPosition(
    innerText,
    cursorPosition,
    promqlCommand.query,
    queryBounds,
    querySlice,
    shouldWrap
  );

  if (queryZone) {
    return queryZone;
  }

  if (isInsideQueryParen(innerCommandText)) {
    return { type: 'query', queryText: '', cursorRelative: 0, shouldWrap };
  }

  return getParamZoneMacroPosition(innerCommandText, shouldWrap, preGroupedAgg);
}

// ============================================================================
// Query zone detection (AST-based)
// ============================================================================

function getQueryZoneMacroPosition(
  innerText: string,
  cursorPosition: number,
  queryNode: ESQLAstPromqlCommand['query'],
  queryBounds: PromqlQueryBounds | undefined,
  querySlice: QuerySlice | undefined,
  shouldWrap: boolean
): PromqlMacroPosition | undefined {
  if (!queryBounds || !isQueryLocationUsable(innerText, queryBounds) || !querySlice) {
    return undefined;
  }

  const { queryEnd, wrappedEnd } = queryBounds;
  const { text, start, originalLength } = querySlice;

  const isPastEnd = cursorPosition > (wrappedEnd ?? queryEnd);
  const isInsideWrapper = wrappedEnd !== undefined && cursorPosition > queryEnd;
  const isInsideNode = queryNode !== undefined && within(cursorPosition, queryNode);

  if (!isPastEnd && !isInsideWrapper && !isInsideNode) {
    return undefined;
  }

  const cursorRelative = Math.min(cursorPosition - start, originalLength);

  return { type: 'query', queryText: text, cursorRelative, shouldWrap };
}

// ============================================================================
// Param zone detection (text-based)
// ============================================================================

function getParamZoneMacroPosition(
  commandText: string,
  shouldWrap: boolean,
  preGroupedAgg: string | undefined
): PromqlMacroPosition {
  const incompleteParam = getIncompleteParamFromText(commandText);

  if (incompleteParam) {
    return {
      type: 'params',
      kind: 'after_param_equals',
      currentParam: incompleteParam,
      shouldWrap,
      preGroupedAgg,
    };
  }

  if (isAfterParamKeyword(commandText)) {
    return { type: 'params', kind: 'after_param_keyword', shouldWrap, preGroupedAgg };
  }

  return { type: 'params', kind: 'after_command', shouldWrap, preGroupedAgg };
}

// ============================================================================
// Zone detection helpers
// ============================================================================

/**
 * Guards against the parser misclassifying params as the query.
 * Rejects invalid query locations (e.g., `PROMQL step` where "step" ends up in query.text).
 */
function isQueryLocationUsable(
  innerText: string,
  queryBounds: ReturnType<typeof getPromqlQueryBounds>
): boolean {
  if (!queryBounds || queryBounds.queryEnd === queryBounds.queryStart) {
    return false;
  }

  const queryText = innerText.substring(queryBounds.queryStart, queryBounds.queryEnd + 1).trim();

  // Reject if empty or looks like a param assignment
  return queryText !== '' && !looksLikePromqlParamAssignment(queryText);
}

/**
 * Detects if cursor is inside an open paren that starts a query context.
 * Handles cases like "PROMQL (" or "PROMQL col0 = (" where the AST doesn't
 * have a query node yet because the content is empty.
 */
function isInsideQueryParen(commandText: string): boolean {
  const trimmed = commandText.trimEnd();
  if (!trimmed.endsWith('(')) {
    return false;
  }

  return getBracketsToClose(trimmed).includes(')');
}

// ============================================================================
// Param text helpers
// ============================================================================

export const isPromqlParamName = (name: string): boolean => PROMQL_PARAM_NAMES.includes(name);

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

export function getPromqlParam(name: string): PromqlParamDefinition | undefined {
  return PROMQL_PARAMS.find((param) => param.name === name);
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

// ============================================================================
// Column Assignment Helpers
// ============================================================================

/** Detects when the cursor is after a custom query assignment like "col0 =". */
function isAfterCustomColumnAssignment(commandText: string): boolean {
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
  const key = getTrailingIdentifier(beforeEquals);

  if (key?.toLowerCase() !== PromqlParamName.Index) {
    return undefined;
  }

  const afterEquals = commandText.slice(equalsIndex + 1);
  const valueStart = equalsIndex + 1 + (afterEquals.length - afterEquals.trimStart().length);

  return { valueText: commandText.slice(valueStart), valueStart };
}
