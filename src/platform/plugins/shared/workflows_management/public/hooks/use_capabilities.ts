/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useKibana } from './use_kibana';

const CapabilitiesMap = {
  canCreateWorkflow: 'createWorkflow',
  canReadWorkflow: 'readWorkflow',
  canUpdateWorkflow: 'updateWorkflow',
  canDeleteWorkflow: 'deleteWorkflow',
  canExecuteWorkflow: 'executeWorkflow',
  canReadWorkflowExecution: 'readWorkflowExecution',
  canCancelWorkflowExecution: 'cancelWorkflowExecution',
} as const;

export type CapabilitiesKey = keyof typeof CapabilitiesMap;
export type WorkflowsManagementCapabilities = Record<CapabilitiesKey, boolean>;

export const useCapabilities = (): WorkflowsManagementCapabilities => {
  const { application } = useKibana().services;

  return Object.fromEntries(
    Object.entries(CapabilitiesMap).map(([key, value]) => [
      key,
      Boolean(application?.capabilities.workflowsManagement?.[value]),
    ])
  ) as WorkflowsManagementCapabilities;
};
