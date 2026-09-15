/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import type { TransformResult, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowStepInsertPath } from './workflow_graph_actions_context';
import { stepSupportsErrorHandling } from './step_supports_error_handling';

/**
 * Splice target for a step-port click: insert into the sequence reached by
 * `path` (omit/empty = top-level `steps`) at `index`.
 */
export interface StepPortTarget {
  readonly index: number;
  readonly path?: WorkflowStepInsertPath;
  readonly sourceNodeId: string;
}

/** Ports mounted on one graph node (edit mode only). */
export interface NodePortTargets {
  /** Bottom-center step port (triggers + regular steps). Absent on `if`. */
  readonly step?: StepPortTarget;
  /** If-node false-branch port → index 0 of `else`. */
  readonly else?: StepPortTarget;
  /** If-node true-branch port → index 0 of `steps`. */
  readonly then?: StepPortTarget;
  /** Error port — only when the step can still receive `on-failure`. */
  readonly errorStepId?: string;
  /** Show a non-interactive error port when `on-failure` is already attached. */
  readonly errorConnected?: boolean;
}

export interface InsertionPoints {
  /** Connection-point targets keyed by graph node id. */
  readonly byNodeId: ReadonlyMap<string, NodePortTargets>;
  /** Top-level step node ids (pending-card / flash helpers). */
  readonly topLevelStepNodeIds: readonly string[];
}

type StepRecord = Record<string, unknown>;

const asSteps = (value: unknown): StepRecord[] =>
  Array.isArray(value) ? (value as StepRecord[]) : [];

const stepName = (step: StepRecord): string | undefined =>
  typeof step.name === 'string' ? step.name : undefined;

const hasOnFailure = (step: StepRecord): boolean =>
  step['on-failure'] !== undefined && step['on-failure'] !== null;

/**
 * Derives node-anchored connection-point targets from the workflow + graph
 * transform. Pure: safe to memoize on the transform.
 */
export function computeInsertionPoints(
  workflow: WorkflowYaml | undefined,
  transformed: TransformResult
): InsertionPoints {
  const steps = asSteps(workflow?.steps);
  const { nodeRefs } = transformed;

  const nodeIdForStepName = (name: string): string | undefined => {
    const match = Object.entries(nodeRefs).find(
      ([, ref]) => ref.kind === 'step' && ref.stepName === name && !ref.fallbackOf
    );
    return match?.[0];
  };

  const byNodeId = new Map<string, NodePortTargets>();
  const topLevelStepNodeIds: string[] = [];

  for (const step of steps) {
    const name = stepName(step);
    if (!name) continue;
    const id = nodeIdForStepName(name);
    if (id) topLevelStepNodeIds.push(id);
  }

  // Trigger ports: insert at index 0 of the top-level steps array.
  for (const [id, ref] of Object.entries(nodeRefs)) {
    if (ref.kind !== 'trigger') continue;
    byNodeId.set(id, {
      step: { index: 0, sourceNodeId: id },
    });
  }

  const walkSequence = (seq: readonly StepRecord[], path: WorkflowStepInsertPath): void => {
    seq.forEach((step, index) => {
      const name = stepName(step);
      const nodeId = name ? nodeIdForStepName(name) : undefined;
      if (!nodeId) return;

      if (step.type === 'if') {
        // TODO(after-block continuation): with terminals removed, there is
        // currently no canvas affordance to insert into the parent sequence
        // *after* an entire if block. Candidates (a port on the block's
        // implicit join vs. accepting YAML-view-only for now) are under
        // discussion. Leave a TODO at the insertion-target mapping; do not
        // add a join or extra port.

        const thenPath: WorkflowStepInsertPath = [
          ...path,
          { stepIndex: index, branch: 'steps' },
        ];
        const elsePath: WorkflowStepInsertPath = [
          ...path,
          { stepIndex: index, branch: 'else' },
        ];
        byNodeId.set(nodeId, {
          then: { index: 0, path: thenPath, sourceNodeId: nodeId },
          else: { index: 0, path: elsePath, sourceNodeId: nodeId },
          // Error port gated by stepSupportsErrorHandling (`if` → false until TODO(engine)).
        });
        walkSequence(asSteps(step.steps), thenPath);
        walkSequence(asSteps(step.else), elsePath);
        return;
      }

      // Regular step: port inserts *after* this node in its containing sequence.
      // TODO(fallback-node ports): on-failure.fallback is a sequence in the
      // spec; fallback nodes will eventually need the same bottom port. Deferred.
      const type = typeof step.type === 'string' ? step.type : undefined;
      byNodeId.set(nodeId, {
        step: {
          index: index + 1,
          path: path.length > 0 ? path : undefined,
          sourceNodeId: nodeId,
        },
        ...(stepSupportsErrorHandling(type)
          ? hasOnFailure(step)
            ? { errorConnected: true }
            : { errorStepId: nodeId }
          : {}),
      });
    });
  };

  walkSequence(steps, []);

  return { byNodeId, topLevelStepNodeIds };
}
