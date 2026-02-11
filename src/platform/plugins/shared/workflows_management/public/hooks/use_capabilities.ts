/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows/common/constants';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
import { useKibana } from './use_kibana';

const CapabilitiesMap = {
  canCreateWorkflow: WorkflowsManagementUiActions.create,
  canReadWorkflow: WorkflowsManagementUiActions.read,
  canUpdateWorkflow: WorkflowsManagementUiActions.update,
  canDeleteWorkflow: WorkflowsManagementUiActions.delete,
  canExecuteWorkflow: WorkflowsManagementUiActions.execute,
  canReadWorkflowExecution: WorkflowsManagementUiActions.readExecution,
  canCancelWorkflowExecution: WorkflowsManagementUiActions.cancelExecution,
} as const;

export type CapabilitiesKey = keyof typeof CapabilitiesMap;
export type WorkflowsManagementCapabilities = Record<CapabilitiesKey, boolean>;

export const useCapabilities = (): WorkflowsManagementCapabilities => {
  const { application } = useKibana().services;
  const workflowsCapabilities = application?.capabilities?.[WORKFLOWS_MANAGEMENT_FEATURE_ID] ?? {};

  return Object.fromEntries(
    Object.entries(CapabilitiesMap).map(([key, value]) => [
      key,
      Boolean(workflowsCapabilities[value]),
    ])
  ) as WorkflowsManagementCapabilities;
};
