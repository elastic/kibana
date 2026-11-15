/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { isManualTrigger } from '@kbn/workflows/spec/schema/triggers/manual_trigger_schema';
import type { WorkflowsManagementCapabilities } from '@kbn/workflows-ui';

export type WorkflowPrivilege = 'read' | 'execute' | 'readExecution';

export type WorkflowRunPanelStatus =
  | { type: 'ready'; workflow: WorkflowDetailDto }
  | { type: 'missing_privileges'; privileges: WorkflowPrivilege[] }
  | { type: 'loading' }
  | { type: 'not_found' }
  | { type: 'load_failed'; message: string }
  | { type: 'not_runnable_by_user'; workflow: WorkflowDetailDto }
  | { type: 'disabled'; workflow: WorkflowDetailDto }
  | { type: 'invalid'; workflow: WorkflowDetailDto }
  | { type: 'no_manual_trigger'; workflow: WorkflowDetailDto };

/** Feature privileges the viewer needs before the panel loads the workflow at all. */
export const getMissingPrivileges = (
  capabilities: WorkflowsManagementCapabilities
): WorkflowPrivilege[] => {
  const missing: WorkflowPrivilege[] = [];
  if (!capabilities.canReadWorkflow) missing.push('read');
  if (!capabilities.canExecuteWorkflow) missing.push('execute');
  if (!capabilities.canReadWorkflowExecution) missing.push('readExecution');
  return missing;
};

interface GetPanelStatusParams {
  capabilities: WorkflowsManagementCapabilities;
  workflow: WorkflowDetailDto | undefined;
  isLoading: boolean;
  error: unknown;
  isNotFound: boolean;
}

/** Decides what the panel shows, in the order a viewer can act on: access first, then the workflow. */
export const getPanelStatus = ({
  capabilities,
  workflow,
  isLoading,
  error,
  isNotFound,
}: GetPanelStatusParams): WorkflowRunPanelStatus => {
  const privileges = getMissingPrivileges(capabilities);
  if (privileges.length > 0) return { type: 'missing_privileges', privileges };
  if (isNotFound) return { type: 'not_found' };
  if (error) {
    return { type: 'load_failed', message: error instanceof Error ? error.message : String(error) };
  }
  if (isLoading || !workflow) return { type: 'loading' };
  if (workflow.permissions?.execute === false) return { type: 'not_runnable_by_user', workflow };
  if (!workflow.valid || !workflow.definition) return { type: 'invalid', workflow };
  if (!workflow.enabled) return { type: 'disabled', workflow };
  if (!workflow.definition.triggers?.some((trigger) => isManualTrigger(trigger))) {
    return { type: 'no_manual_trigger', workflow };
  }
  return { type: 'ready', workflow };
};
