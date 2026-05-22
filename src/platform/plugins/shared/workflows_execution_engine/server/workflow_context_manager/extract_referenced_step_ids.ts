/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractPropertyPathsFromKql, scanForTemplateVariables } from '@kbn/workflows/common/utils';
import type { EnterIfNode, GraphNodeUnion } from '@kbn/workflows/graph';

const STEPS_PREFIX = 'steps.';

/**
 * Per-node cache. Graph nodes are immutable for the lifetime of an execution,
 * and a single node can be analysed many times across loop iterations and
 * retries — memoising keyed by node reference removes the redundant scans
 * without retaining anything once the graph is GC'd.
 */
const referencedStepIdsCache = new WeakMap<GraphNodeUnion, Set<string> | null>();

/**
 * Extracts the set of step IDs referenced by a node's template expressions.
 *
 * Returns:
 * - `Set<string>` of referenced step IDs when all references can be statically resolved
 * - `null` when static analysis is ambiguous (e.g. dynamic bracket access like
 *    `steps[variables.x].output`) — caller should fall back to all predecessors
 *
 * For `enter-if` nodes, KQL condition strings are also analyzed via `extractPropertyPathsFromKql`.
 *
 * Result is memoised per-node — see {@link referencedStepIdsCache}.
 */
export function extractReferencedStepIds(node: GraphNodeUnion): Set<string> | null {
  if (referencedStepIdsCache.has(node)) {
    return referencedStepIdsCache.get(node) as Set<string> | null;
  }
  const result = computeReferencedStepIds(node);
  referencedStepIdsCache.set(node, result);
  return result;
}

function computeReferencedStepIds(node: GraphNodeUnion): Set<string> | null {
  try {
    const variables: string[] = [];

    // For enter-if nodes, the condition can be a KQL string that contains
    // both KQL field references and template expressions. The graph union's
    // `configuration` is broadened (atomic uses `any`), so TypeScript does
    // not narrow `node.configuration` from the `type` discriminator alone —
    // we keep the explicit cast to the if-specific node shape.
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
