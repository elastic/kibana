/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { collectAllSteps } from '@kbn/workflows';

function readType(node: unknown): string | undefined {
  if (node && typeof node === 'object' && 'type' in node) {
    const { type } = node as { type?: unknown };
    return typeof type === 'string' && type.length > 0 ? type : undefined;
  }
  return undefined;
}

function uniqueTypes(nodes: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const node of nodes) {
    const type = readType(node);
    if (type !== undefined && !seen.has(type)) {
      seen.add(type);
      result.push(type);
    }
  }
  return result;
}

/**
 * Extract the distinct step and trigger `type` values from a parsed workflow
 * body, in document order. Mirrors the catalog generator: trigger types come
 * from the top-level `triggers[]` only, step types include nested steps
 * (foreach / if / switch / parallel branches) via `collectAllSteps`. This keeps
 * the detail page's icon row identical to the catalog card and avoids treating
 * a trigger's `inputs[].type` as a trigger.
 */
export function getWorkflowTypes(body: Record<string, unknown>): {
  stepTypes: string[];
  triggerTypes: string[];
} {
  const triggerTypes = uniqueTypes(Array.isArray(body.triggers) ? body.triggers : []);

  let steps: unknown[] = [];
  if (Array.isArray(body.steps)) {
    try {
      steps = collectAllSteps(body.steps as WorkflowYaml['steps']);
    } catch {
      steps = body.steps;
    }
  }
  const stepTypes = uniqueTypes(steps);

  return { stepTypes, triggerTypes };
}
