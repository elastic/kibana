/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step } from './types';
import { visitStepChildSlots } from './walk_step_tree';
import type { StepChildSlot } from './walk_step_tree';
import type { WorkflowYaml } from '../spec/schema';

/**
 * Returns a stable string capturing the workflow's *structure* (trigger types
 * + recursive step `name:type` walk). Used as a memoization key for the graph
 * transform + dagre layout.
 *
 * Edits that do NOT change the fingerprint (e.g. tweaking a step's
 * `description`, `params`, or branch expression) will not retrigger layout.
 *
 * The fingerprint encodes branch *slot* (`steps`, `else`, `branch[n]`,
 * `case[n]`, `default`, `fallback`, `iteration-fallback`) so moving a step
 * from one branch to another always produces a distinct key even when step
 * names and depths are unchanged.
 */
export function computeTopologyFingerprint(workflow: WorkflowYaml | undefined): string {
  if (!workflow) return '';
  const parts: string[] = [];
  for (const trigger of workflow.triggers ?? []) {
    parts.push(`t:${trigger.type}`);
  }
  walkStepsWithSlot(workflow.steps ?? [], parts, 'steps', 0);
  return parts.join('\n');
}

const slotKey = (slot: StepChildSlot): string => {
  switch (slot.kind) {
    case 'steps':
      return 'steps';
    case 'else':
      return 'else';
    case 'branch':
      return `branch[${slot.index}]`;
    case 'case':
      return `case[${slot.index}]`;
    case 'default':
      return 'default';
    case 'fallback':
      return 'fallback';
    case 'iteration-fallback':
      return 'iteration-fallback';
  }
};

function walkStepsWithSlot(
  steps: ReadonlyArray<Step>,
  parts: string[],
  slotPrefix: string,
  depth: number
): void {
  const indent = '  '.repeat(depth);
  for (const step of steps) {
    parts.push(`${indent}${slotPrefix}>${step.name}:${step.type}`);
    visitStepChildSlots(step, (slot, children) => {
      if (children.length > 0) {
        walkStepsWithSlot(children, parts, slotKey(slot), depth + 1);
      }
    });
  }
}
