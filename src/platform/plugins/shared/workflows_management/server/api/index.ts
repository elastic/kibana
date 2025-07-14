/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Client } from '@elastic/elasticsearch';
import { ExecutionStatus, WorkflowListModel, WorkflowModel, WorkflowStatus } from '@kbn/workflows';

export const mockWorkflow: WorkflowModel = {
  id: 'workflow-1',
  name: 'JAMF Enrollment Reminder',
  description: 'Check if the user has enrolled in JAMF, reminds in Slack if not every 7 days.',
  triggers: [
    {
      id: 'trigger1',
      type: 'schedule',
      enabled: true,
    },
  ],
  tags: ['InfoSec', 'Slack'],
  status: WorkflowStatus.ACTIVE,

  createdAt: '2025-06-01T12:00:00.000Z',
  createdBy: 'John Doe',

  lastUpdatedAt: '2025-06-01T09:20:00.000Z',
  lastUpdatedBy: 'John Doe',

  history: Array.from({ length: 14 }, (_, i) => ({
    id: i.toString(),
    status:
      i === 13
        ? ExecutionStatus.RUNNING
        : i % 5 === 0
        ? ExecutionStatus.FAILED
        : ExecutionStatus.COMPLETED,
    startedAt: new Date(2025, 0, 1, 12, 0, 0 + i, 0).toISOString(),
    finishedAt: new Date(2025, 0, 1, 12, 0, 1 + i, 0).toISOString(),
    duration: i % 2 === 0 ? 10 : null,
  })),

  executions: [
    {
      id: '27701bca-1df2-43f4-a2b1-798cfd298a9e',
      finishedAt: '2025-07-08T10:00:10Z',
      startedAt: '2025-07-08T10:00:00Z',
      status: ExecutionStatus.COMPLETED,
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
  steps: [],
  nodes: [],
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
          history: mockWorkflow.history,
          createdAt: mockWorkflow.createdAt,
          createdBy: mockWorkflow.createdBy,
          lastUpdatedAt: mockWorkflow.lastUpdatedAt,
          lastUpdatedBy: mockWorkflow.lastUpdatedBy,
        },
      ],
      _pagination: {
        limit: params.limit,
        offset: params.offset,
        total: 1,
      },
    });
  },
  getWorkflow: async (id: string): Promise<WorkflowModel> => {
    return Promise.resolve(mockWorkflow);
  },
};

export class WorkflowsManagementApiClass {
  private static stepExecutionsIndex = 'workflow-step-executions';
  constructor(private esClient: Client) {}

  async getStepExecutions(workflowExecutionId: string): Promise<any> {
    return this.esClient
      .search({
        index: WorkflowsManagementApiClass.stepExecutionsIndex,
        query: {
          match: { workflowRunId: workflowExecutionId },
        },
      })
      .then((response) => {
        return response.hits.hits.map((hit) => hit._source);
      });
  }
}
