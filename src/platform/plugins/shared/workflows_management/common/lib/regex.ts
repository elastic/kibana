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
export const LIQUID_BLOCK_FILTER_REGEX = /(?:^|[^{])\s*[^{}\s]+\s*\|\s*(\w*)\s*$/;

// Matches liquid keywords within a liquid block (assign, case, when, echo, etc.)
export const LIQUID_BLOCK_KEYWORD_REGEX = /^\s*(\w*)\s*$/;

// Liquid block detection patterns (global versions for matching within text)
export const LIQUID_BLOCK_START_REGEX = /\{\%-?\s*liquid\s/g;
export const LIQUID_BLOCK_END_REGEX = /-?\%\}/g;
