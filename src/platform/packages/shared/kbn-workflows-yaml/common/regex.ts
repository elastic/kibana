/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The characters a mustache key may contain. `}` is deliberately absent: it is what
 * terminates the greedy match below, and keeping it out of the class is what makes the
 * pattern linear.
 */
const VARIABLE_KEY_CHARS = String.raw`[\w.\s|()\[\],"']`;

/**
 * Matches `{{ … }}`. The key is greedy and bounded by the closing braces, with no
 * surrounding `\s*`: an earlier form padded a lazy key with `\s*` on both sides, and
 * because the key class also matches whitespace, the engine had to try every split of a
 * whitespace run between the three (CodeQL `js/polynomial-redos`). `matchVariable` and
 * friends trim the captured key, so callers see the same value as before.
 */
export const VARIABLE_REGEX = new RegExp(String.raw`\{\{(?<key>${VARIABLE_KEY_CHARS}*)\}\}`);
export const VARIABLE_REGEX_GLOBAL = new RegExp(VARIABLE_REGEX.source, 'g');
/** Matches a `{{ …` that runs to the end of the line, for autocomplete. */
export const UNFINISHED_VARIABLE_REGEX_GLOBAL = new RegExp(
  String.raw`\{\{(?<key>${VARIABLE_KEY_CHARS}*)$`,
  'g'
);

/**
 * A match of a mustache-variable pattern above. The `key` group is unconditional in each
 * of them, so it always participates in a successful match and is never `undefined`. It
 * can be the empty string: `{{}}` and `{{ }}` both capture nothing.
 */
export type VariableMatch = RegExpMatchArray & { groups: { key: string } };

/** Trims the captured key in place, so callers never see the padding the class absorbed. */
const withTrimmedKey = (match: RegExpMatchArray | null): VariableMatch | null => {
  if (!match?.groups) {
    return null;
  }
  match.groups.key = match.groups.key.trim();
  return match as VariableMatch;
};

/** The first complete `{{ … }}` expression in `text`, or `null`. */
export const matchVariable = (text: string): VariableMatch | null =>
  withTrimmedKey(VARIABLE_REGEX.exec(text));

/** Every complete `{{ … }}` expression in `text`, in source order. */
export const matchAllVariables = (text: string): VariableMatch[] =>
  Array.from(text.matchAll(VARIABLE_REGEX_GLOBAL), withTrimmedKey).filter(
    (match): match is VariableMatch => match !== null
  );

/** The last complete `{{ … }}` expression in `text`, or `null`. */
export const matchLastVariable = (text: string): VariableMatch | null =>
  matchAllVariables(text).pop() ?? null;

/** The last unterminated `{{ …` expression in `text`, or `null`. */
export const matchLastUnfinishedVariable = (text: string): VariableMatch | null =>
  withTrimmedKey(Array.from(text.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)).pop() ?? null);

export const ALLOWED_KEY_REGEX =
  /^[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[\s*(?:\d+|"[^"]*"|'[^']*')\s*\])*(?:\s*\|.*)?$/;

export const PROPERTY_PATH_REGEX =
  /^[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[\s*(?:\d+|"[^"]*"|'[^']*')\s*\])*$/;

// Liquid-specific regex patterns
// Matches: {{ variable | filter_prefix (but not {{ variable | filter }})
export const LIQUID_FILTER_REGEX = /\{\{\s*[^}]*\|\s*(\w*)\s*$/;

// Matches: variable | filter_prefix within liquid blocks (outside of mustache syntax)
/**
 * LIQUID_BLOCK_FILTER_REGEX matches a variable followed by a filter within a Liquid block, but outside mustache syntax.
 *
 * Regex breakdown:
 * (?:^|[^{])      - Non-capturing group: start of line or any character except '{' (to avoid mustache blocks)
 * \s*             - Optional whitespace
 * [^{}\s]+        - One or more characters that are not '{', '}', or whitespace (the variable name)
 * \s*             - Optional whitespace
 * \|              - Pipe character separating variable and filter
 * \s*             - Optional whitespace
 * (\w*)           - Capturing group: the filter name (alphanumeric/underscore)
 * \s*$            - Optional whitespace to end of line
 *
 * Example match: "foo | filter"
 */
export const LIQUID_BLOCK_FILTER_REGEX = /(?:^|[^{])\s*[^{}\s]+\s*\|\s*(\w*)\s*$/;

// Matches liquid keywords within a liquid block (assign, case, when, echo, etc.)
export const LIQUID_BLOCK_KEYWORD_REGEX = /^\s*(\w*)\s*$/;

// Liquid block detection patterns (global versions for matching within text)
export const LIQUID_BLOCK_START_REGEX = /\{\%-?\s*liquid\s/g;
export const LIQUID_BLOCK_END_REGEX = /-?\%\}/g;

// Liquid template detection patterns for validation
// Matches all Liquid expressions: {{ ... }} and {% ... %}
export const LIQUID_EXPRESSION_REGEX_GLOBAL = /(\{\{[^}]*\}\}|\{\%[^%]*\%\})/g;

// More specific patterns for different Liquid constructs
export const LIQUID_OUTPUT_REGEX_GLOBAL = /\{\{\s*([^}]*?)\s*\}\}/g;
export const LIQUID_TAG_REGEX_GLOBAL = /\{\%\s*([^%]*?)\s*\%\}/g;

export const DYNAMIC_VALUE_REGEX = /^\$\{\{\s*\S[\s\S]*\}\}$/;

/**
 * Checks if a value matches the dynamic/templated value pattern ($<something>)
 * Examples: ${{env.USER}}, ${{ref:myVar}}, ${{someVariable}}
 * Pattern: starts with ${{ and ends with }}, and any non-empty string in between
 */
export function isDynamicValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return DYNAMIC_VALUE_REGEX.test(value);
}

export const VARIABLE_VALUE_REGEX = /^\{\{\s*\S[\s\S]*\}\}$/;

/**
 * Checks if a value matches the variable pattern ({{ variable }})
 * Examples: {{ variable }}, {{ variable | filter }}
 * Pattern: starts with {{ and ends with }}, and any non-empty string in between
 */
export function isVariableValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return VARIABLE_VALUE_REGEX.test(value);
}

// Regex to match Liquid tags: {% ... %} or {%- ... -%} (with optional dashes)
// Matches both single-line and multi-line Liquid tag blocks
export const LIQUID_TAG_VALUE_REGEX = /\{\%-?\s*[^%]*?\s*-?\%\}/s;

/**
 * Checks if a value contains Liquid tag patterns ({% ... %} or {%- ... -%})
 * Examples: {% if condition %}, {%- if condition -%}, multi-line blocks with Liquid tags
 * Pattern: matches {% or {%- followed by content and %} or -%}
 * The 's' flag allows . to match newlines for multi-line support
 */
export function isLiquidTagValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return LIQUID_TAG_VALUE_REGEX.test(value);
}
