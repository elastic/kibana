/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ESQL_IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';

// Matches a comma followed only by optional trailing whitespace.
const TRAILING_COMMA_REGEX = /,\s*$/;
// Matches an assignment operator followed only by optional trailing whitespace.
const TRAILING_ASSIGNMENT_REGEX = /=\s*$/;
// Checks whether the last character is whitespace.
const TRAILING_WHITESPACE_REGEX = /\s$/;
// Checks whether the last character is not whitespace.
const TRAILING_NON_WHITESPACE_REGEX = /\S$/;
// Checks whether any whitespace exists in the text.
const CONTAINS_WHITESPACE_REGEX = /\s/;
// Matches text made only of one or more whitespace characters.
const ONLY_WHITESPACE_REGEX = /^\s+$/;
// Checks whether text starts with a word character.
const STARTS_WITH_WORD_CHAR_REGEX = /^\w/;
// Finds the first non-whitespace character.
const NON_WHITESPACE_REGEX = /\S/;
// Matches an opening parenthesis followed only by optional trailing whitespace.
const TRAILING_OPEN_PAREN_REGEX = /\(\s*$/;
// Matches characters that need escaping inside a regular expression.
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
// Matches one or more whitespace characters for normalization.
const WHITESPACE_NORMALIZE_REGEX = /\s+/g;
// Extracts an ES|QL identifier followed only by optional trailing whitespace.
const TRAILING_IDENTIFIER_REGEX = new RegExp(`(${ESQL_IDENTIFIER_PATTERN})\\s*$`);

export function endsWithComma(text: string): boolean {
  return TRAILING_COMMA_REGEX.test(text);
}

export function endsWithAssignment(text: string): boolean {
  return TRAILING_ASSIGNMENT_REGEX.test(text);
}

export function endsWithWhitespace(text: string): boolean {
  return TRAILING_WHITESPACE_REGEX.test(text);
}

export function endsWithNonWhitespace(text: string): boolean {
  return TRAILING_NON_WHITESPACE_REGEX.test(text);
}

export function containsWhitespace(text: string): boolean {
  return CONTAINS_WHITESPACE_REGEX.test(text);
}

export function isOnlyWhitespace(text: string): boolean {
  return ONLY_WHITESPACE_REGEX.test(text);
}

export function startsWithWordChar(text: string): boolean {
  return STARTS_WITH_WORD_CHAR_REGEX.test(text);
}

export function endsWithOpenParen(text: string): boolean {
  return TRAILING_OPEN_PAREN_REGEX.test(text);
}

export function escapeRegExp(text: string): string {
  return text.replace(REGEX_SPECIAL_CHARS, '\\$&');
}

/** Extracts the trailing identifier from text (e.g., "start" from "end=value start"). */
export function getTrailingIdentifier(text: string): string | undefined {
  const match = text.match(TRAILING_IDENTIFIER_REGEX);

  return match ? match[1] : undefined;
}

export function findFirstNonWhitespaceIndex(text: string): number {
  return text.search(NON_WHITESPACE_REGEX);
}

export function normalizeWhitespace(text: string): string {
  return text.replace(WHITESPACE_NORMALIZE_REGEX, ' ');
}
