/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstDenseVectorCommand, ESQLAstField } from '@elastic/esql/types';
import { isColumn, isMap, isOptionNode } from '@elastic/esql';

/**
 * The keyword accepted by the `suffix = "..." ON ...` modifier. The grammar accepts any
 * identifier there, so callers must check it against this value — Elasticsearch rejects
 * anything else.
 */
export const DENSE_VECTOR_SUFFIX_KEYWORD = 'suffix';

/** Suffix applied to the generated columns when `suffix = "..."` is not specified. */
export const DENSE_VECTOR_DEFAULT_SUFFIX = '_dense_vector';

export enum CaretPosition {
  FIELD_LIST, // After DENSE_VECTOR: the field list, optionally opened by `target =`
  AFTER_LITERAL_INPUT, // After a string literal input: `ON` (to make it a suffix), WITH or pipe
  SUFFIX_ON_FIELD_LIST, // After `suffix = "..." ON`: the field list
  AFTER_WITH_KEYWORD, // After WITH but before the opening brace: suggest the map opener
  WITHIN_MAP_EXPRESSION, // Within WITH { ... }: suggest map parameters
  AFTER_COMMAND, // Command is complete: suggest pipe
}

/**
 * The command has four surface forms, which the parser disambiguates for us:
 *
 * - `DENSE_VECTOR f1, f2`           → `fields`
 * - `DENSE_VECTOR target = f1`      → `targetField` + `fields`
 * - `DENSE_VECTOR target = "text"`  → `targetField` + `literalInput`
 * - `DENSE_VECTOR suffix = "_dv" ON f1, f2` → `suffix` + `fields`
 *
 * Note `suffix` is only populated once `ON` is typed; until then `suffix = "_dv"` looks
 * exactly like the literal-input form, which is why {@link CaretPosition.AFTER_LITERAL_INPUT}
 * offers `ON`.
 */
export function getPosition(
  command: ESQLAstDenseVectorCommand,
  cursorPosition: number
): CaretPosition {
  const { namedParameters, suffix, literalInput } = command;

  if (namedParameters !== undefined) {
    const map = isMap(namedParameters) ? namedParameters : undefined;

    // `WITH` typed without a brace yet parses to an empty, incomplete map.
    if (!map || (map.incomplete && !map.text)) {
      return CaretPosition.AFTER_WITH_KEYWORD;
    }

    const isWithinMap = map.incomplete
      ? !(map.text.trimEnd().endsWith('}') && cursorPosition > map.location.max)
      : cursorPosition <= map.location.max;

    return isWithinMap ? CaretPosition.WITHIN_MAP_EXPRESSION : CaretPosition.AFTER_COMMAND;
  }

  if (suffix !== undefined) {
    return CaretPosition.SUFFIX_ON_FIELD_LIST;
  }

  if (literalInput !== undefined) {
    return CaretPosition.AFTER_LITERAL_INPUT;
  }

  return CaretPosition.FIELD_LIST;
}

/**
 * The expressions making up the top-level field list. Option nodes (`ON`, `WITH`) are dropped
 * so only the field expressions remain — including the leading `target = field` assignment,
 * which `suggestFieldsList` unwraps on its own.
 */
export const getFieldListExpressions = (command: ESQLAstDenseVectorCommand): ESQLAstField[] =>
  command.args.filter((arg) => {
    if (Array.isArray(arg)) {
      return true;
    }

    return !isOptionNode(arg) && !(isColumn(arg) && !arg.name);
  }) as ESQLAstField[];

/** Matches the leading `DENSE_VECTOR` keyword, so it can be stripped from the command text. */
const COMMAND_KEYWORD_REGEX = /^\s*dense_vector\b/i;

/**
 * Text typed after the DENSE_VECTOR keyword and before the cursor.
 *
 * The guards below read the text rather than the AST because the autocomplete parse path drops
 * the trailing empty column after a comma: `DENSE_VECTOR a, ` and `DENSE_VECTOR a ` both yield
 * `fields: ['a']`, so the AST alone cannot tell which list position the cursor is in.
 */
const getTextAfterCommandKeyword = (
  query: string,
  command: ESQLAstDenseVectorCommand,
  cursorPosition: number
): string => query.slice(command.location.min, cursorPosition).replace(COMMAND_KEYWORD_REGEX, '');

/**
 * Whether the `suffix = "..." ON` modifier can still be typed: it must come first and only
 * once, so only while nothing at all has been typed after the keyword.
 */
export const canSuggestSuffixModifier = (
  query: string,
  command: ESQLAstDenseVectorCommand,
  cursorPosition: number
): boolean =>
  command.targetField === undefined &&
  getTextAfterCommandKeyword(query, command, cursorPosition).trim() === '';

/**
 * Whether a `col0 = ` suggestion is valid at the cursor. The grammar only accepts an assignment
 * as the first item of the list — `DENSE_VECTOR a, col0 = b` is a syntax error.
 */
export const canSuggestTargetAssignment = (
  query: string,
  command: ESQLAstDenseVectorCommand,
  cursorPosition: number
): boolean =>
  command.targetField === undefined &&
  !getTextAfterCommandKeyword(query, command, cursorPosition).includes(',');

/**
 * Whether a string literal assigned to a name is the start of the `suffix = "..." ON` form
 * rather than a literal input.
 *
 * `suffix = "_dv"` only becomes {@link ESQLAstDenseVectorCommand.suffix} once `ON` is parsed,
 * so until then the two forms look identical. When the name is the reserved `suffix` keyword
 * the user is writing the suffix form, and the command is not complete without `ON <fields>`.
 */
export const isPendingSuffixModifier = (command: ESQLAstDenseVectorCommand): boolean =>
  command.targetField?.name.toLowerCase() === DENSE_VECTOR_SUFFIX_KEYWORD;

/**
 * Names of the `dense_vector` columns the command generates. The source fields are kept, so
 * these are always additional — unlike the sibling TEXT command, which replaces them.
 *
 * One name per input field, suffixed. `target = <input>` instead names a single output column,
 * whatever the input is.
 *
 * A bare string literal (`DENSE_VECTOR "some text"`) generates a column whose name is not
 * specified by the design doc, so none is reported rather than guessing one.
 */
export const getDenseVectorColumnNames = (command: ESQLAstDenseVectorCommand): string[] => {
  const { targetField, suffix, fields } = command;

  if (targetField !== undefined) {
    return [targetField.name];
  }

  const appliedSuffix = suffix?.valueUnquoted ?? DENSE_VECTOR_DEFAULT_SUFFIX;

  return (fields ?? []).filter(({ name }) => name).map(({ name }) => `${name}${appliedSuffix}`);
};
