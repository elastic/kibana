/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractPropertyPathsFromKql, extractTemplateVariables } from '@kbn/workflows/common/utils';
import type { EnterIfNode, GraphNodeUnion } from '@kbn/workflows/graph';

const STEPS_PREFIX = 'steps.';

/**
 * Recursively scans any value tree for Liquid template variables.
 * Mirrors the private `scanValueForVariablesRecursively` in `findInputsInGraph`.
 */
function scanForTemplateVariables(value: unknown): string[] {
  if (typeof value === 'string') {
    return extractTemplateVariables(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap(scanForTemplateVariables);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, unknown>).flatMap(scanForTemplateVariables);
  }

  return [];
}

/**
 * Extracts the set of step IDs referenced by a node's template expressions.
 *
 * Returns:
 * - `Set<string>` of referenced step IDs when all references can be statically resolved
 * - `null` when static analysis is ambiguous (e.g. dynamic bracket access like
 *    `steps[variables.x].output`) — caller should fall back to all predecessors
 *
 * For `enter-if` nodes, KQL condition strings are also analyzed via `extractPropertyPathsFromKql`.
 */
export function extractReferencedStepIds(node: GraphNodeUnion): Set<string> | null {
  try {
    const variables: string[] = [];

    // For enter-if nodes, the condition can be a KQL string that contains
    // both KQL field references and template expressions
    if (node.type === 'enter-if') {
      const { condition } = (node as EnterIfNode).configuration;
      if (typeof condition === 'string') {
        variables.push(...extractPropertyPathsFromKql(condition));
      }
    }

    // Scan the entire node's configuration for template variables
    // This covers `with`, `condition`, `foreach`, `expression`, `match`, etc.
    if ('configuration' in node) {
      variables.push(...scanForTemplateVariables(node.configuration));
    }

    const referencedStepIds = new Set<string>();

    for (const variable of variables) {
      if (variable === 'steps') {
        // Bare `steps` reference means the path was truncated at a dynamic bracket access
        // (e.g. `steps[variables.name].output`). We cannot determine the step ID statically.
        return null;
      }

      if (variable.startsWith(STEPS_PREFIX)) {
        // Extract step ID: `steps.myStep.output.field` → `myStep`
        const dotIndex = variable.indexOf('.', STEPS_PREFIX.length);
        const stepId =
          dotIndex === -1
            ? variable.slice(STEPS_PREFIX.length)
            : variable.slice(STEPS_PREFIX.length, dotIndex);

        if (stepId) {
          referencedStepIds.add(stepId);
        }
      }
    }

    return referencedStepIds;
  } catch {
    // If template parsing fails for any reason, fall back to all predecessors
    return null;
  }
}
