/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface WorkflowGraphActions {
  /** Called when the user clicks the Play icon on a node hover. */
  onStepRun?: (stepName: string) => void;
  /** Whether the workflow allows the user to run individual steps. */
  canRunSteps?: boolean;
  /**
   * Called right before the "More" popover opens, so the caller can update
   * any per-step state (e.g. dispatch focused-step info to Redux) the menu
   * items rely on.
   */
  onOpenStepMenu?: (stepName: string) => void;
  /**
   * Renders the menu items shown inside the "More" popover. `close` should
   * be wired to each item's `onClick` so the popover dismisses after action.
   */
  renderStepMenuItems?: (close: () => void) => ReactNode;
}

export const WorkflowGraphActionsContext = createContext<WorkflowGraphActions>({});

export function useWorkflowGraphActions(): WorkflowGraphActions {
  return useContext(WorkflowGraphActionsContext);
}
