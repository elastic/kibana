/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

/**
 * Matches Liquid tags: {% ... %} or {%- ... -%}, single-line or multi-line. The dashes and
 * the padding are already matched by `[^%]*`, so the pattern needs no `-?` / `\s*` around it.
 * Padding it with `\s*` (as an earlier form did) made an unclosed `{%` followed by a
 * whitespace run cubic, because the engine tried every split of the run (CodeQL
 * `js/polynomial-redos`).
 */
export const LIQUID_TAG_VALUE_REGEX = /\{\%[^%]*\%\}/;

/**
 * Checks if a value contains Liquid tag patterns ({% ... %} or {%- ... -%})
 * Examples: {% if condition %}, {%- if condition -%}, multi-line blocks with Liquid tags
 */
export function isLiquidTagValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return LIQUID_TAG_VALUE_REGEX.test(value);
}
