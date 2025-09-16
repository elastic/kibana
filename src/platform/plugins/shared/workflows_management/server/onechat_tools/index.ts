/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { WorkflowsManagementApi } from '../workflows_management/workflows_management_api';
import {
  executeWorkflowTool,
  getWorkflowDetailsTool,
  getWorkflowResultTool,
  listWorkflowsTool,
} from './workflow_tools';

/**
 * Creates and returns all workflow-related onechat tools
 */
export function createWorkflowTools(
  managementApi: WorkflowsManagementApi
): BuiltinToolDefinition<any>[] {
  return [
    listWorkflowsTool(managementApi),
    getWorkflowDetailsTool(managementApi),
    executeWorkflowTool(managementApi),
    getWorkflowResultTool(managementApi),
  ];
}

/**
 * Workflow tool IDs for reference
 */
export const WORKFLOW_TOOL_IDS = {
  LIST_WORKFLOWS: 'list_workflows',
  GET_WORKFLOW_DETAILS: 'get_workflow_details',
  EXECUTE_WORKFLOW: 'execute_workflow',
  GET_WORKFLOW_RESULT: 'get_workflow_result',
} as const;

export { executeWorkflowTool, getWorkflowDetailsTool, getWorkflowResultTool, listWorkflowsTool };
