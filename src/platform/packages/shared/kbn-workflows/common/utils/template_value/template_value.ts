/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ZodError } from '@kbn/zod/v4';

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

/** Whether a value is a template that only renders at run time: `${{ }}`, `{{ }}` or a Liquid tag. */
export function isTemplateValue(value: unknown): boolean {
  return isDynamicValue(value) || isVariableValue(value) || isLiquidTagValue(value);
}

type ValidationIssue = ZodError['issues'][number];

/**
 * Whether `issue` is only there because a template (see `isTemplateValue`) sits where a concrete
 * value is expected, so it can't be judged before the template renders. `root` is the parsed value
 * the issue paths point into.
 *
 * An issue on a template value is dropped, whatever its code. That covers a discriminated union that
 * cannot pick a branch: zod reports `invalid_union` on the discriminator with no branch errors.
 *
 * An `invalid_union` issue on a larger object sits on the union's own path, where the value is never
 * a template. Its `errors` hold one list of issues per branch, with paths relative to the union. The
 * union is satisfied when one branch fails on templates alone, so the issue is dropped then. Unions
 * nest, hence the recursion.
 */
export function isIssueOnTemplateValue(
  issue: ValidationIssue,
  root: unknown,
  basePath: ReadonlyArray<PropertyKey> = []
): boolean {
  const path = [...basePath, ...(issue.path ?? [])];
  if (path.length > 0 && isTemplateAt(root, path)) {
    return true;
  }
  if (issue.code === 'invalid_union') {
    return issue.errors.some((branchIssues) =>
      branchIssues.every((branchIssue) => isIssueOnTemplateValue(branchIssue, root, path))
    );
  }
  return false;
}

const isTemplateAt = (root: unknown, path: ReadonlyArray<PropertyKey>): boolean => {
  let value: unknown = root;
  for (const segment of path) {
    if (value == null || typeof value !== 'object') {
      return false; // The path leads nowhere, so there is no template to excuse the issue.
    }
    value = (value as Record<PropertyKey, unknown>)[segment];
  }
  return isTemplateValue(value);
};
