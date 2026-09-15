/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, type ReactNode, useContext } from 'react';
import type { NodePortTargets } from './compute_insertion_points';
import type { PendingInsertVisual } from './pending_insert';

/**
 * Render-prop type for injecting a custom icon resolver into the graph canvas.
 * Callers (plugin call sites) return whatever React element they want. The
 * graph node passes an explicit `color` (the step/trigger palette tone) so
 * mask-based monochrome icons can be tinted to match the node, without changing
 * the shared icon's neutral default in other contexts.
 */
export type RenderStepIcon = (args: {
  stepType: string;
  isTrigger: boolean;
  size?: 'm' | 'l';
  /** Palette tint for monochrome (mask-based) icons; ignored by multi-color logos. */
  color?: string;
}) => ReactNode;

/**
 * Walk from the root `steps` array into a nested branch. Each segment selects
 * `steps[stepIndex]` then opens that step's `steps` (then) or `else` array.
 * An empty path means the top-level `steps` array.
 */
export type WorkflowStepInsertPath = ReadonlyArray<{
  readonly stepIndex: number;
  readonly branch: 'steps' | 'else';
}>;

/**
 * Where an insertion lands. `step` splices into a steps array at `index`
 * (top-level when `path` is omitted/empty; otherwise nested); `trigger`
 * appends to `triggers`; `error` adds a fallback step to the `on-failure` of
 * the node identified by `stepId` (a graph node id).
 */
export type WorkflowGraphInsertionContext =
  | { readonly mode: 'trigger' }
  | {
      readonly mode: 'step';
      readonly index: number;
      readonly path?: WorkflowStepInsertPath;
      /** Preferred graph node to hang the pending card under. */
      readonly sourceNodeId?: string;
    }
  | { readonly mode: 'error'; readonly stepId: string };

/** Screen-space rectangle of the control that opened an insertion, for anchoring the menu. */
export interface WorkflowGraphAnchorRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Editing callbacks. Their presence on the context switches the canvas into
 * edit mode (insertion controls, node action cluster, keyboard delete).
 * Every handler receives graph node ids; the caller maps them back to the
 * YAML document via `TransformResult.nodeRefs`.
 */
export interface WorkflowGraphEditActions {
  onInsert: (context: WorkflowGraphInsertionContext, anchor: WorkflowGraphAnchorRect) => void;
  onEditStep: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export interface WorkflowGraphActions {
  /** Called when the user clicks the Play icon on a node hover. */
  onStepRun?: (stepName: string) => void;
  /** Whether the workflow allows the user to run individual steps. */
  canRunSteps?: boolean;
  /** Called when the user keyboard-activates (Enter/Space) a node. */
  onStepSelect?: (nodeId: string) => void;
  /**
   * Optional renderer for step icons inside graph nodes. When provided, the
   * canvas delegates icon resolution to the caller (e.g. the plugin's
   * `<StepIcon/>` which consults the extension registry and action-type
   * registry). Falls back to the built-in `STEP_TYPE_ICON` table when absent.
   */
  renderStepIcon?: RenderStepIcon;
  /** Edit-mode callbacks; undefined renders the read-only canvas. */
  edit?: WorkflowGraphEditActions;
  /** Node ids whose step is missing a schema-required field. */
  incompleteNodeIds?: ReadonlySet<string>;
  /**
   * Connection-point targets per node id. Present only in edit mode when
   * insertion controls are not suppressed; read-only omits ports entirely.
   */
  portTargetsByNodeId?: ReadonlyMap<string, NodePortTargets>;
  /**
   * In-progress insert (Actions menu / placeholder). Ports use this so an
   * error-path definition keeps the origin port visibly active.
   */
  pendingInsert?: PendingInsertVisual | null;
}

export const WorkflowGraphActionsContext = createContext<WorkflowGraphActions>({});

export function useWorkflowGraphActions(): WorkflowGraphActions {
  return useContext(WorkflowGraphActionsContext);
}
