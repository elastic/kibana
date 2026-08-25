/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const VARIABLE_REGEX = /\{\{\s*(?<key>[\w.\s|()\[\],"']*?[\w.\s|()\[\],"'])\s*\}\}/;
export const VARIABLE_REGEX_GLOBAL = new RegExp(VARIABLE_REGEX.source, 'g');
export const UNFINISHED_VARIABLE_REGEX_GLOBAL =
  /\{\{\s*(?<key>[\w.\s|()\[\],"']*?[\w.\s|()\[\],"']?)\s*$/g;

/**
 * A match of a mustache-variable pattern above. The `key` group is unconditional in each
 * of them, so it always participates in a successful match and is never `undefined`.
 * `UNFINISHED_VARIABLE_REGEX_GLOBAL` makes its final character optional, so an unfinished
 * `key` can be the empty string.
 */
export type VariableMatch = RegExpMatchArray & { groups: { key: string } };

/** The first complete `{{ … }}` expression in `text`, or `null`. */
export const matchVariable = (text: string): VariableMatch | null =>
  VARIABLE_REGEX.exec(text) as VariableMatch | null;

/** Every complete `{{ … }}` expression in `text`, in source order. */
export const matchAllVariables = (text: string): VariableMatch[] =>
  Array.from(text.matchAll(VARIABLE_REGEX_GLOBAL)) as VariableMatch[];

/** The last complete `{{ … }}` expression in `text`, or `null`. */
export const matchLastVariable = (text: string): VariableMatch | null =>
  matchAllVariables(text).pop() ?? null;

/** The last unterminated `{{ …` expression in `text`, or `null`. */
export const matchLastUnfinishedVariable = (text: string): VariableMatch | null => {
  const matches = Array.from(text.matchAll(UNFINISHED_VARIABLE_REGEX_GLOBAL)) as VariableMatch[];
  return matches.pop() ?? null;
};

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
