/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BranchSlot, Step, TransformResult, WorkflowYaml } from '@kbn/workflows';
import { visitStepChildSlots } from '@kbn/workflows';
import { stepSupportsErrorHandling } from './step_supports_error_handling';

/** Ports mounted on one graph node (edit mode only). */
export interface NodePortTargets {
  /**
   * Bottom-center flow port — triggers + regular steps. Absent on fork nodes (if/switch/parallel).
   * `stepName` is present for step nodes; absent for trigger nodes (use `prepend-step` context).
   */
  readonly step?: {
    readonly sourceNodeId: string;
    readonly stepName?: string;
    readonly isTerminal?: boolean;
  };
  /**
   * Branch ports on fork nodes (if/switch/parallel). Each key is the `BranchSlot`
   * that the port's click resolves to. Keyed by the slot's distinguishing label:
   * 'else' | 'steps' (then) | branch index string | case match string | 'default'.
   * `ownerStepName` is the name of the fork step that owns the branch.
   */
  readonly branches?: ReadonlyMap<
    string,
    { readonly slot: BranchSlot; readonly ownerStepName: string; readonly isTerminal: boolean }
  >;
  /**
   * Fallback port — only present when the step supports error-handling and has
   * no fallback steps yet.
   */
  readonly fallbackTarget?: { readonly stepName: string; readonly nodeId: string };
  /**
   * Non-interactive fallback anchor — step already has fallback steps. The failure
   * edge emerges from this port; it is a visual anchor, not a gesture target.
   */
  readonly fallbackConnected?: boolean;
}

export interface InsertionPoints {
  /** Connection-point targets keyed by graph node id. */
  readonly byNodeId: ReadonlyMap<string, NodePortTargets>;
  /** Top-level step node ids (pending-card / flash helpers). */
  readonly topLevelStepNodeIds: readonly string[];
}

/** True when `on-failure.fallback` has at least one step (graph error route). */
const hasFallbackSteps = (step: Step): boolean => {
  const onFailure = (step as Record<string, unknown>)['on-failure'];
  if (typeof onFailure !== 'object' || onFailure === null) return false;
  const fallback = (onFailure as Record<string, unknown>).fallback;
  return Array.isArray(fallback) && fallback.length > 0;
};

/** Label string for a BranchSlot used as a Map key. */
const slotKey = (slot: BranchSlot): string => {
  switch (slot.kind) {
    case 'steps':
      return 'steps';
    case 'else':
      return 'else';
    case 'branch':
      return `branch:${slot.index}`;
    case 'case':
      // Key by index (not match) so freshly-added cases with match:'' don't collide.
      // compute_wire_insertion_controls.ts uses branchIndex for switch edges to match.
      return `case:${slot.index}`;
    case 'default':
      return 'default';
  }
};

/**
 * Derives node-anchored connection-point targets from the workflow + graph
 * transform. Pure: safe to memoize on the transform.
 *
 * Uses ADR-0007 name addressing. The walk is driven by `visitStepChildSlots`
 * so switch/parallel/foreach branches get ports automatically.
 */
export function computeInsertionPoints(
  workflow: WorkflowYaml | undefined,
  transformed: TransformResult
): InsertionPoints {
  const { nodeRefs } = transformed;

  // Build reverse lookup O(n) up-front, avoiding O(n²) inner loop.
  const nodeIdByStepName = new Map<string, string>();
  for (const [id, ref] of Object.entries(nodeRefs)) {
    if (ref.kind === 'step') {
      // Prefer non-fallback nodes (fallback nodes share the step name but are
      // graph-duplicates; the authoritative port lives on the spine node).
      if (!nodeIdByStepName.has(ref.stepName)) {
        nodeIdByStepName.set(ref.stepName, id);
      }
    }
  }

  const byNodeId = new Map<string, NodePortTargets>();
  const topLevelStepNodeIds: string[] = [];

  const steps = Array.isArray(workflow?.steps) ? (workflow?.steps as Step[]) : [];

  // Collect top-level node ids in declaration order.
  for (const step of steps) {
    const id = nodeIdByStepName.get(step.name);
    if (id) topLevelStepNodeIds.push(id);
  }

  // Trigger ports: flow port inserts at the first position in top-level steps.
  for (const [id, ref] of Object.entries(nodeRefs)) {
    if (ref.kind === 'trigger') {
      byNodeId.set(id, {
        step: { sourceNodeId: id, isTerminal: steps.length === 0 },
      });
    }
  }

  const walkStep = (step: Step, isLastInSeq: boolean): void => {
    const id = nodeIdByStepName.get(step.name);
    if (!id) return;

    // Resolve type up-front so it can gate both the container-branch fix and
    // the flow-port addition for container types inside the hasBranches path.
    const type =
      typeof (step as Record<string, unknown>).type === 'string'
        ? String((step as Record<string, unknown>).type)
        : undefined;
    const isContainerType = type === 'foreach' || type === 'while';

    const branches = new Map<
      string,
      { slot: BranchSlot; ownerStepName: string; isTerminal: boolean }
    >();
    let hasBranches = false;

    visitStepChildSlots(step, (slot, childSteps) => {
      // Fallback slots are not branch ports — they map to the red error port.
      if (slot.kind === 'fallback' || slot.kind === 'iteration-fallback') return;

      hasBranches = true;
      branches.set(slotKey(slot), {
        slot,
        ownerStepName: step.name,
        isTerminal: childSteps.length === 0,
      });

      // Recurse into the slot's children.
      childSteps.forEach((child, idx) => {
        walkStep(child, idx === childSteps.length - 1);
      });
    });

    // Container steps with no 'steps' key: visitStepChildSlots never fires for
    // the body slot, so hasBranches stays false. Force-emit the branch so the
    // node gets a branch port (the body + button) even when the body is empty.
    if (isContainerType && !hasBranches) {
      hasBranches = true;
      branches.set('steps', {
        slot: { kind: 'steps' },
        ownerStepName: step.name,
        isTerminal: true,
      });
    }

    // if steps always present both 'then' (steps) and 'else' branch ports,
    // even when those keys are absent from the YAML. Without this, visitStepChildSlots
    // fires nothing → hasBranches stays false → node gets a spurious step port
    // that produces a phantom middle terminal stub instead of the two expected branch stubs.
    if (type === 'if') {
      if (!branches.has('steps')) {
        hasBranches = true;
        branches.set('steps', {
          slot: { kind: 'steps' },
          ownerStepName: step.name,
          isTerminal: true,
        });
      }
      if (!branches.has('else')) {
        hasBranches = true;
        branches.set('else', {
          slot: { kind: 'else' },
          ownerStepName: step.name,
          isTerminal: true,
        });
      }
    }
    // switch always gets a 'default' branch port so the implicit default lane
    // produced by the transform is always selectable (even with 0 explicit cases).
    if (type === 'switch' && !branches.has('default')) {
      hasBranches = true;
      branches.set('default', {
        slot: { kind: 'default' },
        ownerStepName: step.name,
        isTerminal: true,
      });
    }

    const supportsFallback = stepSupportsErrorHandling(type);

    if (hasBranches) {
      // Foreach/while body insertion is handled by the container's own ⊕ button
      // (WorkflowGraphForeachGroupNode). Exposing the 'steps' branch here would
      // cause computeWireInsertionControls to emit a spurious terminal stub
      // outside the container, producing a duplicate ⊕ below the container.
      const effectiveBranches = isContainerType
        ? new Map([...branches].filter(([k]) => k !== 'steps'))
        : branches;

      // Fork nodes (if/switch/parallel) always get an "after block" step port.
      // This produces the single "+" below the merge point whether or not there
      // is a step after the fork. Container types get this port unconditionally too.
      const isForkType =
        !isContainerType && (type === 'if' || type === 'switch' || type === 'parallel');

      byNodeId.set(id, {
        branches: effectiveBranches.size > 0 ? effectiveBranches : undefined,
        // Container nodes (foreach/while) also get a flow port so steps can be
        // inserted after the container in the outer sequence. ADR-0001 D6 is
        // relaxed for containers — a step after a loop is a common pattern.
        ...(isContainerType
          ? { step: { sourceNodeId: id, stepName: step.name, isTerminal: isLastInSeq } }
          : isForkType
          ? { step: { sourceNodeId: id, stepName: step.name, isTerminal: isLastInSeq } }
          : {}),
        ...(supportsFallback
          ? hasFallbackSteps(step)
            ? { fallbackConnected: true }
            : { fallbackTarget: { stepName: step.name, nodeId: id } }
          : {}),
      });
    } else {
      // Regular step: flow port inserts after this node.
      byNodeId.set(id, {
        step: { sourceNodeId: id, stepName: step.name, isTerminal: isLastInSeq },
        ...(supportsFallback
          ? hasFallbackSteps(step)
            ? { fallbackConnected: true }
            : { fallbackTarget: { stepName: step.name, nodeId: id } }
          : {}),
      });
    }
  };

  steps.forEach((step, idx) => walkStep(step, idx === steps.length - 1));

  return { byNodeId, topLevelStepNodeIds };
}
