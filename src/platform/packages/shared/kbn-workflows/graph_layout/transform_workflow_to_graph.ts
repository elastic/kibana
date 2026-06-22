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
import type {
  ForEachStep,
  IfStep,
  MergeStep,
  ParallelStep,
  SwitchStep,
  WorkflowYaml,
} from '../spec/schema';

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  alert: 'Alert',
  scheduled: 'Scheduled',
};

function getTriggerLabel(triggerType: string): string {
  return TRIGGER_LABEL[triggerType] ?? triggerType;
}

/** Collapse duplicate exit ids when empty branches fall through via the same gate. */
function dedupeIds(ids: string[]): string[] {
  return ids.length <= 1 ? ids : [...new Set(ids)];
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
    ids
  );
  return { nodes, edges, foreachGroups };
}

function transformInternal(
  triggers: WorkflowYaml['triggers'],
  steps: Step[],
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
      for (const sourceId of dedupeIds(prevExitIds)) {
        edges.push({ id: `${sourceId}:${id}`, source: sourceId, target: id });
      }
    }

    // Default exit point for this step is itself; control structures override
    // this with the leaves of their branches.
    let exitIds: string[] = [id];

    // Every foreach with a `steps` body renders as a group container, at any
    // nesting depth. The container is a self-contained "folder": one edge in
    // (from the previous outer step), one edge out (to the next outer step),
    // and inner steps only connect to each other.
    const isForeachGroup = step.type === 'foreach';

    if (isForeachGroup) {
      const foreachStep = step as ForEachStep;
      // Render the container as a `foreachGroup` node (full-width header +
      // body). The regular step node would overlap with the inner children.
      const groupNode: PreLayoutForeachGroupNode = {
        id,
        type: 'foreachGroup',
        data: { label: step.name, stepType: 'foreach', step },
        style: { ...DEFAULT_NODE_STYLE },
      };
      nodes.push(groupNode);

      const childSteps = (foreachStep.steps as Step[]) ?? [];
      const inner = transformInternal([], childSteps, ids);
      foreachGroups.push({
        id,
        innerNodes: inner.nodes,
        innerEdges: inner.edges,
      });
      foreachGroups.push(...inner.foreachGroups);

      // The foreach group is a self-contained "folder": one edge in (from the
      // previous sibling to the group itself), one edge out (the next sibling
      // joins from the group's id via `exitIds = [id]` below), and the inner
      // steps only connect to each other. Deliberately NOT adding an edge
      // from the group to its first inner step — that line would cross the
      // container boundary and clutter the diagram.
    } else {
      const stepNode: PreLayoutStepNode = {
        id,
        type: 'step',
        data: { label: step.name, stepType: step.type, step },
        style: { ...DEFAULT_NODE_STYLE },
      };
      nodes.push(stepNode);
    }

    if (step.type === 'if') {
      const ifStep = step as IfStep;
      const thenSteps = (ifStep.steps as Step[]) ?? [];
      const elseSteps: Step[] = Array.isArray(ifStep.else) ? (ifStep.else as Step[]) : [];

      const branchExits: string[] = [];

      if (thenSteps.length > 0) {
        const inner = transformInternal([], thenSteps, ids);
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
        const inner = transformInternal([], elseSteps, ids);
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

      exitIds = dedupeIds(branchExits);
    } else if (step.type === 'parallel') {
      const parallelStep = step as ParallelStep;
      const branches = (parallelStep.branches as Array<{ name?: string; steps: Step[] }>) ?? [];
      const branchExits: string[] = [];
      branches.forEach((branch, idx) => {
        if (!Array.isArray(branch.steps) || branch.steps.length === 0) {
          // Empty branch — fall through via the gate node's id (same semantics as `if`).
          branchExits.push(id);
          return;
        }
        const inner = transformInternal([], branch.steps, ids);
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
      if (branchExits.length > 0) exitIds = dedupeIds(branchExits);
    } else if (step.type === 'switch') {
      const switchStep = step as SwitchStep;
      const cases =
        (switchStep.cases as Array<{ match: string | number | boolean; steps: Step[] }>) ?? [];
      const branchExits: string[] = [];

      const defaultSteps = switchStep.default as Step[] | undefined;
      const hasDefault = Array.isArray(defaultSteps) && defaultSteps.length > 0;

      // Rule 1 — one labeled edge per case (label = match value).
      cases.forEach((caseItem, idx) => {
        if (!Array.isArray(caseItem.steps) || caseItem.steps.length === 0) {
          // Defensive: empty case in loose/partial schema — fall through the gate.
          branchExits.push(id);
          return;
        }
        const inner = transformInternal([], caseItem.steps as Step[], ids);
        nodes.push(...inner.nodes);
        edges.push(...inner.edges);
        foreachGroups.push(...inner.foreachGroups);
        const firstId = inner.nodes[0]?.id;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-case-${idx}`,
            source: id,
            target: firstId,
            branchType: 'switch',
            label: String(caseItem.match),
          });
        }
        branchExits.push(...inner.leafIds);
      });

      // Rule 2 — `default` branch, labeled 'default'.
      if (hasDefault) {
        const inner = transformInternal([], defaultSteps as Step[], ids);
        nodes.push(...inner.nodes);
        edges.push(...inner.edges);
        foreachGroups.push(...inner.foreachGroups);
        const firstId = inner.nodes[0]?.id;
        if (firstId) {
          edges.push({
            id: `${id}:${firstId}-default`,
            source: id,
            target: firstId,
            branchType: 'switch',
            label: 'default',
          });
        }
        branchExits.push(...inner.leafIds);
      } else {
        // Rule 3 — no `default`: push the gate id so the generic sibling-connector
        // emits a plain (unlabeled) edge from the gate to the next step.
        branchExits.push(id);
      }

      if (branchExits.length > 0) exitIds = dedupeIds(branchExits);
    } else if (step.type === 'merge') {
      const mergeStep = step as MergeStep;
      const childSteps = (mergeStep.steps as Step[]) ?? [];
      const inner = transformInternal([], childSteps, ids);
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
