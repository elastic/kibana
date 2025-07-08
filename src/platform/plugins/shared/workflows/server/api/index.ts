/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ExecutionStatus,
  WorkflowListModel,
  WorkflowModel,
  WorkflowStatus,
} from '../../common/types/latest';

export const mockWorkflow: WorkflowModel = {
  id: 'workflow-1',
  name: 'Sample Workflow',
  description: 'A sample workflow for testing',
  triggers: [
    {
      id: 'trigger1',
      type: 'manual',
      enabled: true,
    },
  ],
  tags: ['test', 'sample'],
  status: WorkflowStatus.ACTIVE,

  createdAt: '2025-07-08T10:00:00Z',
  createdBy: 'Kirill Chernakov',

  lastUpdatedAt: '2025-07-08T10:00:00Z',
  lastUpdatedBy: 'Kirill Chernakov',

  history: [],

  executions: [
    {
      id: '27701bca-1df2-43f4-a2b1-798cfd298a9e',
      finishedAt: '2025-07-08T10:00:10Z',
      startedAt: '2025-07-08T10:00:00Z',
      status: ExecutionStatus.SUCCESS,
      logs: [
        {
          timestamp: '2025-07-08T10:00:01Z',
          level: 'INFO',
          message: 'Test log',
        },
      ],
    },
  ],
  yaml: '',
  definition: [],
};

export interface GetWorkflowsParams {
  limit: number;
  offset: number;
}

export const WorkflowsManagementApi = {
  getWorkflows: async (params: GetWorkflowsParams): Promise<WorkflowListModel> => {
    return Promise.resolve({
      results: [
        {
          id: mockWorkflow.id,
          name: mockWorkflow.name,
          description: mockWorkflow.description,
          status: mockWorkflow.status,
          triggers: mockWorkflow.triggers,
          tags: mockWorkflow.tags,
          yaml: mockWorkflow.yaml,
          definition: mockWorkflow.definition,
          executions: mockWorkflow.executions,
          history: mockWorkflow.history,
          createdAt: mockWorkflow.createdAt,
          createdBy: mockWorkflow.createdBy,
          lastUpdatedAt: mockWorkflow.lastUpdatedAt,
          lastUpdatedBy: mockWorkflow.lastUpdatedBy,
        },
      ],
      _pagination: {
        limit: 10,
        offset: 0,
        total: 1,
      },
    });
  },
  getWorkflow: async (id: string): Promise<WorkflowModel> => {
    return Promise.resolve(mockWorkflow);
  },
};
