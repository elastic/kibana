/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createWorkflowLiquidEngine } from '../create_workflow_liquid_engine/create_workflow_liquid_engine';

const liquidEngine = createWorkflowLiquidEngine({
  strictFilters: false,
  strictVariables: false,
});

/** Matches any Liquid template syntax in a string. */
const TEMPLATE_SYNTAX_PATTERN = /\{\{|\{%/;

/**
 * Extracts the set of predecessor stepIds that a step's template expressions
 * directly reference via `steps.<stepId>.*` paths.
 *
 * - Returns `string[]` when all references are statically resolvable.
 *   An empty array means the fields contain no `steps.*` references at all.
 * - Returns `null` when any expression contains a dynamic step reference
 *   (e.g. `steps[variable].output`) that cannot be statically resolved.
 *   Callers should fall back to loading all transitive predecessors in that case.
 *
 * **Caller responsibility:** pass only the template-bearing fields that belong to
 * THIS step node — child step arrays (e.g. `foreach.steps`, `while.steps`) must
 * be excluded by the caller (allowlist per step type) to avoid collecting deps
 * that belong to descendant nodes.
 *
 * @param fields - Template-bearing values to analyze (e.g. `[step.with, step.if]`).
 * @returns Array of unique referenced stepIds, or `null` if static analysis is not possible.
 */
export const extractStepDependencies = (fields: unknown[]): string[] | null => {
  const stepIds = new Set<string>();
  for (const field of fields) {
    if (!collectFromValue(field, stepIds)) {
      return null;
    }
  }
  return Array.from(stepIds);
};

/**
 * Recursively walks `value` collecting referenced stepIds into `stepIds`.
 * Returns `false` immediately when a dynamic (non-static) reference is found.
 */
const collectFromValue = (value: unknown, stepIds: Set<string>): boolean => {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return true;
  }

  if (typeof value === 'string') {
    return collectFromString(value, stepIds);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!collectFromValue(item, stepIds)) return false;
    }
    return true;
  }

  if (typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      if (!collectFromValue(nested, stepIds)) return false;
    }
    return true;
  }

  return true;
};

const collectFromString = (template: string, stepIds: Set<string>): boolean => {
  // Normalize the ${{ prefix used by some workflow expressions
  const normalized =
    template.startsWith('${{') && template.endsWith('}}') ? template.substring(1) : template;

  if (!TEMPLATE_SYNTAX_PATTERN.test(normalized)) {
    return true; // No template syntax — nothing to extract
  }

  let parsed;
  try {
    parsed = liquidEngine.parse(normalized);
  } catch {
    // Unparseable template — treat conservatively as a dynamic ref
    return false;
  }

  const allSegments = liquidEngine.globalVariableSegmentsSync(parsed);

  for (const path of allSegments) {
    // A segment that is not a string or number indicates dynamic bracket access
    // (e.g. steps[variable].output) — cannot be statically resolved.
    const isStatic = path.every(
      (segment) => typeof segment === 'string' || typeof segment === 'number'
    );
    if (!isStatic) {
      return false;
    }

    // Collect stepIds from paths like ['steps', '<stepId>', ...]
    if (path[0] === 'steps' && typeof path[1] === 'string') {
      stepIds.add(path[1]);
    }
  }

  return true;
};
