/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, type ReactNode, useContext } from 'react';

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
}

export const WorkflowGraphActionsContext = createContext<WorkflowGraphActions>({});

export function useWorkflowGraphActions(): WorkflowGraphActions {
  return useContext(WorkflowGraphActionsContext);
}
