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
  ESQLAstItem,
  ESQLColumn,
  ESQLCommandOption,
  ESQLFunction,
  ESQLIdentifier,
} from '@elastic/esql/types';
import {
  Walker,
  isColumn,
  isFunctionExpression,
  isIdentifier,
  isMap,
  isOptionNode,
} from '@elastic/esql';
import type { ESQLColumnData } from '../types';
import { METADATA_FIELDS } from '../options/metadata';

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

/** Functions whose first argument is the field the query targets. */
const FIELD_TARGETING_QUERY_FUNCTIONS = ['match', 'match_phrase', ':'];

/** Column types HIGHLIGHT can highlight; `semantic_text` is treated as `text`. */
const HIGHLIGHTABLE_COLUMN_TYPES = ['text', 'keyword', 'semantic_text'];

const WILDCARD = '*';

/** Names of the fields a field-targeting query (MATCH, MATCH_PHRASE, `:`) searches. */
export const getQueryFieldNames = (queryExpression: ESQLAstItem): string[] => {
  const queryFields: string[] = [];

  Walker.walk(queryExpression as ESQLFunction, {
    visitFunction: (fn) => {
      if (!FIELD_TARGETING_QUERY_FUNCTIONS.includes(fn.name.toLowerCase())) {
        return;
      }

      const [target] = fn.args;

      if (!Array.isArray(target) && isColumn(target)) {
        queryFields.push(target.name);
      }
    },
  });

  return queryFields;
};

/** Every text and keyword column, which is what `ON *` covers; metadata columns are excluded. */
const getHighlightableColumnNames = (columns: ESQLColumnData[]): string[] =>
  columns
    .filter(
      ({ name, type }) =>
        HIGHLIGHTABLE_COLUMN_TYPES.includes(type) && !METADATA_FIELDS.includes(name)
    )
    .map(({ name }) => name);

/**
 * The fields HIGHLIGHT highlights. Without ON they come from the query: the field a
 * field-targeting query searches, or every text and keyword column. With no query either, they
 * come from an earlier WHERE, which is not looked up here, so any text or keyword column is
 * assumed: a column that is not generated is never reported unknown, at the cost of suggesting
 * a few extra.
 */
const getHighlightFieldNames = (
  command: ESQLAstHighlightCommand,
  columns: ESQLColumnData[]
): string[] => {
  const { highlightFields, queryExpression } = command;

  if (highlightFields === undefined) {
    const queryFields = queryExpression === undefined ? [] : getQueryFieldNames(queryExpression);

    return queryFields.length > 0 ? queryFields : getHighlightableColumnNames(columns);
  }

  return highlightFields.flatMap((field) => {
    // A parameter cannot be resolved to a column name without its value.
    if (!isColumn(field) && !isIdentifier(field)) {
      return [];
    }

    if (field.name === WILDCARD) {
      return getHighlightableColumnNames(columns);
    }

    // Any other pattern is rejected by validation, so it has no column to generate.
    return field.name.includes(WILDCARD) ? [] : [field.name];
  });
};

/**
 * Names of the columns HIGHLIGHT generates: one per highlighted field, prefixed. An empty prefix
 * makes the highlighted value overwrite the source column. The `columns` are needed to resolve
 * `ON *`, and an omitted ON that is derived from the query.
 */
export const getHighlightColumnNames = (
  command: ESQLAstHighlightCommand,
  columns: ESQLColumnData[] = []
): string[] => {
  const prefix = getHighlightPrefix(command);

  return getHighlightFieldNames(command, columns).map((name) => `${prefix}${name}`);
};
