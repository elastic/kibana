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
import {
  getPromqlParam,
  isPromqlParamName,
  looksLikePromqlParamAssignment,
  PromqlParamValueType,
} from './parameters';
import { findFinalWord } from '../../definitions/utils/autocomplete/helpers';

type PromqlPositionType =
  | 'after_command'
  | 'after_param_keyword'
  | 'after_param_equals'
  | 'inside_query'
  | 'after_query';

interface PromqlPosition {
  type: PromqlPositionType;
  currentParam?: string;
}

export function getPosition(innerText: string, command: ESQLAstAllCommands): PromqlPosition {
  const promqlCommand = command as ESQLAstPromqlCommand;

  const queryZonePosition = getQueryZonePosition(innerText, promqlCommand);

  if (queryZonePosition) {
    return queryZonePosition;
  }

  // Fallback to param zone detection (text-based, for transitional states)
  const commandText = innerText.substring(promqlCommand.location.min);

  return getParamZonePosition(commandText);
}

// ============================================================================
// Query zone detection (AST-based)
// ============================================================================

/*
 * Uses AST query location to decide whether the cursor is in/after the query.
 * We keep this separate to avoid misclassifying param edits as query edits.
 */
function getQueryZonePosition(
  innerText: string,
  promqlCommand: ESQLAstPromqlCommand
): PromqlPosition | undefined {
  const queryNode = promqlCommand.query;
  const queryLocation = queryNode?.location;

  if (!isQueryLocationUsable(innerText, queryLocation)) {
    return undefined;
  }

  if (queryLocation && innerText.length > queryLocation.max) {
    return { type: 'after_query' };
  }

  if (queryNode && within(innerText.length, queryNode)) {
    return { type: 'inside_query' };
  }

  return undefined;
}

/*
 * Guards against the parser misclassifying the last param as the query.
 * If the "query" looks like a param assignment, stay in param mode.
 */
function isQueryLocationUsable(
  innerText: string,
  queryLocation: { min: number; max: number } | undefined
): boolean {
  if (queryLocation === undefined || queryLocation.max <= queryLocation.min) {
    return false;
  }

  const queryText = innerText.substring(queryLocation.min, queryLocation.max + 1);

  return isPromqlQueryText(queryText);
}

function isPromqlQueryText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed !== '' && !looksLikePromqlParamAssignment(trimmed);
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

/* Identifies a param assignment in progress so we can switch to value suggestions.*/
function getIncompleteParamFromText(text: string): string | undefined {
  const trimmed = text.trimEnd();

  if (!trimmed.endsWith('=')) {
    return undefined;
  }

  const beforeEquals = trimmed.slice(0, -1).trimEnd();
  const paramName = findFinalWord(beforeEquals).toLowerCase();

  return isPromqlParamName(paramName) ? paramName : undefined;
}

/* Detects the "param name + space" pattern to suggest the "=" token. */
function isAfterParamKeyword(text: string): boolean {
  if (!text.endsWith(' ')) {
    return false;
  }

  const trimmed = text.trimEnd();
  const lastWord = findFinalWord(trimmed).toLowerCase();

  return isPromqlParamName(lastWord);
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

interface IndexAssignmentContext {
  valueText: string;
  valueStart: number;
}

/* Extracts the raw index value text so we can reuse source-suggestion logic. */
export function getIndexAssignmentContext(
  commandText: string,
  assignmentKey: string = 'index'
): IndexAssignmentContext | undefined {
  const equalsIndex = commandText.lastIndexOf('=');
  if (equalsIndex < 0) {
    return undefined;
  }

  const beforeEquals = commandText.slice(0, equalsIndex).trimEnd();
  const key = findFinalWord(beforeEquals);

  if (key.toLowerCase() !== assignmentKey.toLowerCase()) {
    return undefined;
  }

  const afterEquals = commandText.slice(equalsIndex + 1);
  const valueStart = equalsIndex + 1 + (afterEquals.length - afterEquals.trimStart().length);

  return { valueText: commandText.slice(valueStart), valueStart };
}
