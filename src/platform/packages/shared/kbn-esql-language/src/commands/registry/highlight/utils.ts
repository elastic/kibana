/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLAstHighlightCommand,
  ESQLColumn,
  ESQLCommandOption,
  ESQLFunction,
  ESQLIdentifier,
} from '@elastic/esql/types';
import { isColumn, isFunctionExpression, isIdentifier, isMap, isOptionNode } from '@elastic/esql';

/**
 * The keyword accepted by the optional `prefix = "..."` modifier. Elasticsearch rejects
 * any other identifier there.
 */
export const HIGHLIGHT_PREFIX_KEYWORD = 'prefix';

/**
 * Prefix applied to the generated columns when `prefix = "..."` is not specified.
 * Mirrors `Highlight.DEFAULT_PREFIX` in Elasticsearch.
 */
export const HIGHLIGHT_DEFAULT_PREFIX = 'highlight_';

/** The keyword introducing the mandatory field list. */
export const HIGHLIGHT_ON_KEYWORD = 'on';

/** Matches the leading `HIGHLIGHT` keyword, so it can be stripped from the command text. */
const COMMAND_KEYWORD_REGEX = /^\s*highlight\b/i;

/** Matches a `prefix =` modifier still waiting for its value at the cursor. */
const PENDING_PREFIX_ASSIGNMENT_REGEX = /\bprefix\s*=\s*$/i;

export enum CaretPosition {
  PREFIX_VALUE, // After `prefix =`: suggest the prefix string
  QUERY_EXPRESSION, // Before ON: build the query expression (and optionally start a prefix)
  ON_KEYWORD, // After a complete query expression: suggest ON keyword
  ON_EXPRESSION, // After ON: suggest field list (comma + more fields handled by suggestFieldsList)
  AFTER_WITH_KEYWORD, // After WITH but before opening brace: suggest map opener
  WITHIN_MAP_EXPRESSION, // Within WITH { ... }: suggest map parameters
  AFTER_COMMAND, // Command is complete: suggest pipe
}

/** Text typed after the HIGHLIGHT keyword and before the cursor. */
const getTextAfterCommandKeyword = (
  query: string,
  command: ESQLAstHighlightCommand,
  cursorPosition: number
): string => query.slice(command.location.min, cursorPosition).replace(COMMAND_KEYWORD_REGEX, '');

/**
 * The parser error-recovers `HIGHLIGHT "fox" O` by substituting the typed token for the ON
 * keyword, so the command carries an `on` option even though the user is still typing it.
 * Only treat it as a real ON clause when the source actually holds the keyword.
 */
const findOnOption = (
  query: string,
  command: ESQLAstHighlightCommand
): ESQLCommandOption | undefined => {
  const onOption = command.args.find(
    (arg): arg is ESQLCommandOption =>
      isOptionNode(arg) && arg.name.toLowerCase() === HIGHLIGHT_ON_KEYWORD
  );

  if (!onOption) {
    return undefined;
  }

  const { min } = onOption.location;
  const sourceKeyword = query.slice(min, min + HIGHLIGHT_ON_KEYWORD.length).toLowerCase();

  return sourceKeyword === HIGHLIGHT_ON_KEYWORD ? onOption : undefined;
};

export function getPosition(
  query: string,
  command: ESQLAstHighlightCommand,
  cursorPosition: number
): CaretPosition {
  const { queryExpression, namedParameters } = command;

  if (namedParameters !== undefined) {
    const map = isMap(namedParameters) ? namedParameters : undefined;
    if (!map || (map.incomplete && !map.text)) return CaretPosition.AFTER_WITH_KEYWORD;

    const isWithinMap = map.incomplete
      ? !(map.text.trimEnd().endsWith('}') && cursorPosition > map.location.max)
      : cursorPosition <= map.location.max;

    if (!isWithinMap) return CaretPosition.AFTER_COMMAND;

    return CaretPosition.WITHIN_MAP_EXPRESSION;
  }

  const onOption = findOnOption(query, command);

  if (onOption && cursorPosition > onOption.location.min + 1) {
    return CaretPosition.ON_EXPRESSION;
  }

  const textAfterKeyword = getTextAfterCommandKeyword(query, command, cursorPosition);

  if (
    command.prefix?.incomplete === true ||
    PENDING_PREFIX_ASSIGNMENT_REGEX.test(textAfterKeyword)
  ) {
    return CaretPosition.PREFIX_VALUE;
  }

  if (
    queryExpression &&
    !queryExpression.incomplete &&
    cursorPosition > queryExpression.location.max
  ) {
    return CaretPosition.ON_KEYWORD;
  }

  return CaretPosition.QUERY_EXPRESSION;
}

/**
 * The identifier on the left of the `prefix = "..."` assignment, when the command has one.
 * The parser accepts any identifier there, so callers must check it against
 * {@link HIGHLIGHT_PREFIX_KEYWORD} — Elasticsearch rejects anything else.
 */
export const getPrefixKeyword = (
  command: ESQLAstHighlightCommand
): ESQLColumn | ESQLIdentifier | undefined => {
  const assignment = command.args.find(
    (arg): arg is ESQLFunction =>
      !Array.isArray(arg) && isFunctionExpression(arg) && arg.name === '='
  );

  if (!assignment) {
    return undefined;
  }

  const [left] = assignment.args;

  return !Array.isArray(left) && (isColumn(left) || isIdentifier(left)) ? left : undefined;
};

/**
 * Whether the `prefix = "..."` modifier can still be typed at the cursor: it must come first
 * and only once.
 */
export const canSuggestPrefix = (
  query: string,
  command: ESQLAstHighlightCommand,
  cursorPosition: number
): boolean => {
  if (command.prefix || command.queryExpression) {
    return false;
  }

  const textAfterKeyword = getTextAfterCommandKeyword(query, command, cursorPosition);

  return !textAfterKeyword.includes('=') && !textAfterKeyword.includes('"');
};

/** The prefix applied to the generated columns, falling back to the Elasticsearch default. */
export const getHighlightPrefix = (command: ESQLAstHighlightCommand): string =>
  command.prefix?.valueUnquoted ?? HIGHLIGHT_DEFAULT_PREFIX;

/**
 * Names of the columns HIGHLIGHT generates: one per ON field, prefixed. An empty prefix makes
 * the highlighted value overwrite the source column.
 */
export const getHighlightColumnNames = (command: ESQLAstHighlightCommand): string[] => {
  const prefix = getHighlightPrefix(command);

  return (command.highlightFields ?? []).map(({ name }) => `${prefix}${name}`);
};
