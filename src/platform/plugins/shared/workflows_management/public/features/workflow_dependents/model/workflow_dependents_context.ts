/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { UseWorkflowDependentsResult } from './use_workflow_dependents';

export type WorkflowLinksTab = 'usedBy' | 'runs';

export interface WorkflowDependentsContextValue {
  dependents: UseWorkflowDependentsResult;
  openLinks: (tab: WorkflowLinksTab) => void;
  /** Resolves false when the user cancels a save that breaks workflows calling this one. */
  confirmBreakingChange: () => Promise<boolean>;
}

export const WorkflowDependentsContext = createContext<WorkflowDependentsContextValue | null>(null);

/** The connected-workflows analysis, or undefined outside a `WorkflowDependentsProvider`. */
export const useWorkflowDependentsContext = (): WorkflowDependentsContextValue | undefined =>
  useContext(WorkflowDependentsContext) ?? undefined;

/** The save check, or undefined outside a `WorkflowDependentsProvider`, where nothing is checked. */
export const useConfirmBreakingChange = (): (() => Promise<boolean>) | undefined =>
  useContext(WorkflowDependentsContext)?.confirmBreakingChange;
