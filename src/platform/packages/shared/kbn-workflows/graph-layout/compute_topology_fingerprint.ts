/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { walkStepTree } from './walk_step_tree';
import type { WorkflowYaml } from '../spec/schema';

/**
 * Returns a stable string capturing the workflow's *structure* (trigger types
 * + recursive step `name:type` walk). Used as a memoization key for the graph
 * transform + dagre layout.
 *
 * Edits that do NOT change the fingerprint (e.g. tweaking a step's
 * `description`, `params`, or branch expression) will not retrigger layout.
 */
export function computeTopologyFingerprint(workflow: WorkflowYaml | undefined): string {
  if (!workflow) return '';
  const parts: string[] = [];
  for (const trigger of workflow.triggers ?? []) {
    parts.push(`t:${trigger.type}`);
  }
  walkStepTree(workflow.steps ?? [], (step, depth) => {
    const indent = '  '.repeat(depth);
    parts.push(`${indent}${step.name}:${step.type}`);
  });
  return parts.join('\n');
}
