/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const VARIABLE_REGEX_GLOBAL = /\{\{\s*(?<key>[\w.\s|()\[\],"']*?[\w.\s|()\[\],"'])\s*\}\}/g;
export const UNFINISHED_VARIABLE_REGEX_GLOBAL =
  /\{\{\s*(?<key>[\w.\s|()\[\],"']*?[\w.\s|()\[\],"']?)\s*$/g;

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
