/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IdAllocator } from './id_allocator';
import type {
  ForeachGroup,
  GraphEdge,
  PreLayoutForeachGroupNode,
  PreLayoutNode,
  PreLayoutStepNode,
  PreLayoutTriggerNode,
  Step,
} from './types';
import { DEFAULT_NODE_STYLE } from './types';
import type { WorkflowYaml } from '../spec/schema';

function getStepProp<T>(step: Step, key: string): T | undefined {
  return (step as unknown as Record<string, T>)[key];
}

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  alert: 'Alert',
  scheduled: 'Scheduled',
};

function getTriggerLabel(triggerType: string): string {
  return TRIGGER_LABEL[triggerType] ?? triggerType;
}

export interface TransformResult {
  nodes: PreLayoutNode[];
  edges: GraphEdge[];
  foreachGroups: ForeachGroup[];
}

interface InternalTransformResult extends TransformResult {
  /**
   * Ids of nodes at this level that have no outgoing edge inside this subtree
   * — i.e. the natural "exit points" the next sibling at the parent level
   * should connect from. For a flat list of regular steps this is just the
   * last step's id. For a list ending in an if/parallel it's the union of
   * each branch's leaves.
   */
  leafIds: string[];
}

/**
 * Transforms the parsed `WorkflowYaml` into a flat list of pre-layout nodes
 * and edges plus an optional list of `foreachGroup` containers (top-level
 * foreach steps render their body inside a visual container).
 *
 * Pure: same input → same output. Safe to memoize on the topology fingerprint.
 */
export function transformWorkflowToGraph(workflow: WorkflowYaml | undefined): TransformResult {
  if (!workflow) return { nodes: [], edges: [], foreachGroups: [] };

  const ids = new IdAllocator();
  const { nodes, edges, foreachGroups } = transformInternal(
    workflow.triggers ?? [],
    workflow.steps ?? [],
    0,
    ids
  );
  return { nodes, edges, foreachGroups };
}

function transformInternal(
  triggers: WorkflowYaml['triggers'],
  steps: Step[],
  depth: number,
  ids: IdAllocator
): InternalTransformResult {
  const nodes: PreLayoutNode[] = [];
  const edges: GraphEdge[] = [];
  const foreachGroups: ForeachGroup[] = [];

  const triggerIds: string[] = [];
  for (const trigger of triggers) {
    const id = ids.allocate(trigger.type);
    triggerIds.push(id);
    const triggerNode: PreLayoutTriggerNode = {
      id,
      type: 'trigger',
      data: {
        stepType: trigger.type,
        label: getTriggerLabel(trigger.type),
        isTrigger: true,
      },
      style: { ...DEFAULT_NODE_STYLE },
    };
    nodes.push(triggerNode);
  }

  const stepIds = steps.map((step) => ids.allocate(step.name));

  // Tracks the "live" exit ids at the previous step that the *next* step in
  // the sibling sequence should connect from. For regular steps that's the
  // step's own id; for `if`/`parallel` it's the leaves of every branch so
  // sibling-after-the-if joins both branches together.
  let prevExitIds: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const id = stepIds[i];

    // First step gets connected to all triggers
    if (i === 0) {
      for (const triggerId of triggerIds) {
        edges.push({ id: `${triggerId}:${id}`, source: triggerId, target: id });
      }
    } else {
      // Connect from each exit point of the previous sibling.
      for (const sourceId of prevExitIds) {
        edges.push({ id: `${sourceId}:${id}`, source: sourceId, target: id });
      }
    }

    // Default exit point for this step is itself; control structures override
    // this with the leaves of their branches.
    let exitIds: string[] = [id];

    // Top-level foreach renders as a group container; deeper foreach renders flat.
    const isTopLevelForeach =
      step.type === 'foreach' && 'steps' in step && Array.isArray(step.steps) && depth === 0;

    if (isTopLevelForeach) {
      // Render the container as a `foreachGroup` node (dashed wrapper).
      // The regular step node would overlap with the inner children.
      const groupNode: PreLayoutForeachGroupNode = {
        id,
        type: 'foreachGroup',
        data: { label: step.name, stepType: 'foreach', step },
        style: { ...DEFAULT_NODE_STYLE },
      };
      nodes.push(groupNode);

      const childSteps = getStepProp<Step[]>(step, 'steps') ?? [];
      const inner = transformInternal([], childSteps, depth + 1, ids);
      foreachGroups.push({
        id,
        innerNodes: inner.nodes.map((n) => ({ ...n, parentId: id, extent: 'parent' as const })),
        innerEdges: inner.edges,
      });
      foreachGroups.push(...inner.foreachGroups);

      if (childSteps.length > 0) {
        const firstNestedId = inner.nodes[0]?.id;
        if (firstNestedId) {
          edges.push({
            id: `${id}:${firstNestedId}`,
            source: id,
            target: firstNestedId,
            branchType: 'foreachBody',
            label: 'for each item',
          });
        }
      }
      // The foreach group is rendered as a contained body, so the next sibling
      // joins from the foreach step itself (not from the inner leaves).
    } else {
      const stepNode: PreLayoutStepNode = {
        id,
        type: 'step',
        data: { label: step.name, stepType: step.type, step },
        style: { ...DEFAULT_NODE_STYLE },
      };
      nodes.push(stepNode);
    }

    if (step.type === 'if' && 'steps' in step && Array.isArray(step.steps)) {
      const thenSteps = getStepProp<Step[]>(step, 'steps') ?? [];
      const rawElse = getStepProp<unknown>(step, 'else');
      const elseSteps: Step[] = Array.isArray(rawElse) ? (rawElse as Step[]) : [];

      const branchExits: string[] = [];

      if (thenSteps.length > 0) {
        const inner = transformInternal([], thenSteps, depth + 1, ids);
        nodes.push(...inner.nodes);
        edges.push(...inner.edges);
        foreachGroups.push(...inner.foreachGroups);
        const firstId = inner.nodes[0]?.id;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-then`,
            source: id,
            target: firstId,
            branchType: 'then',
            label: 'true',
          });
        }
        branchExits.push(...inner.leafIds);
      } else {
        // No `then` body — the true path is "skip and continue".
        branchExits.push(id);
      }

      if (elseSteps.length > 0) {
        const inner = transformInternal([], elseSteps, depth + 1, ids);
        nodes.push(...inner.nodes);
        edges.push(...inner.edges);
        foreachGroups.push(...inner.foreachGroups);
        const firstId = inner.nodes[0]?.id;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-else`,
            source: id,
            target: firstId,
            branchType: 'else',
            label: 'false',
          });
        }
        branchExits.push(...inner.leafIds);
      } else {
        // No `else` body — the false path bypasses the if entirely.
        branchExits.push(id);
      }

      exitIds = branchExits;
    } else if (
      !isTopLevelForeach &&
      step.type === 'foreach' &&
      'steps' in step &&
      Array.isArray(step.steps)
    ) {
      // Nested foreach renders flat
      const childSteps = getStepProp<Step[]>(step, 'steps') ?? [];
      const inner = transformInternal([], childSteps, depth + 1, ids);
      nodes.push(...inner.nodes);
      edges.push(...inner.edges);
      foreachGroups.push(...inner.foreachGroups);
      const firstId = inner.nodes[0]?.id;
      if (firstId) {
        edges.push({
          id: `${id}:${firstId}`,
          source: id,
          target: firstId,
          branchType: 'foreachBody',
          label: 'for each item',
        });
      }
      // After the loop the next sibling joins from the loop step itself.
    } else if (
      step.type === 'parallel' &&
      'branches' in step &&
      Array.isArray(getStepProp<unknown>(step, 'branches'))
    ) {
      const branches = getStepProp<Array<{ name?: string; steps: Step[] }>>(step, 'branches') ?? [];
      const branchExits: string[] = [];
      branches.forEach((branch, idx) => {
        if (!Array.isArray(branch.steps) || branch.steps.length === 0) return;
        const inner = transformInternal([], branch.steps, depth + 1, ids);
        nodes.push(...inner.nodes);
        edges.push(...inner.edges);
        foreachGroups.push(...inner.foreachGroups);
        const firstId = inner.nodes[0]?.id;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-branch-${idx}`,
            source: id,
            target: firstId,
            branchIndex: idx,
            label: branch.name ?? `branch ${idx + 1}`,
          });
        }
        branchExits.push(...inner.leafIds);
      });
      if (branchExits.length > 0) exitIds = branchExits;
    } else if (
      (step.type === 'merge' || step.type === 'atomic') &&
      'steps' in step &&
      Array.isArray(getStepProp<unknown>(step, 'steps'))
    ) {
      const childSteps = getStepProp<Step[]>(step, 'steps') ?? [];
      const inner = transformInternal([], childSteps, depth + 1, ids);
      nodes.push(...inner.nodes);
      edges.push(...inner.edges);
      foreachGroups.push(...inner.foreachGroups);
      const firstId = inner.nodes[0]?.id;
      if (firstId) {
        edges.push({ id: `${id}:${firstId}`, source: id, target: firstId });
      }
      // Single contained body — exit from the wrapping step.
    }

    prevExitIds = exitIds;
  }

  return { nodes, edges, foreachGroups, leafIds: prevExitIds };
}
