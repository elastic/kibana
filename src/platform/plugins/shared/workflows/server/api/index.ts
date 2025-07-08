import { RunStatus, WorkflowDetailDTO, WorkflowListDTO } from '../../common/workflows/models/types';

const mockWorkflow: WorkflowDetailDTO = {
  id: '1',
  name: 'Mock Workflow',
  description: 'Description 1',
  triggers: [],
  tags: [],
  enabled: true,
  runHistory: [
    {
      id: '1',
      status: RunStatus.FAILED,
      startedAt: '2025-06-01T12:00:00.000Z',
      finishedAt: '2025-06-01T12:00:01.000Z',
      duration: 1,
    },
    {
      id: '2',
      status: RunStatus.SUCCESS,
      startedAt: '2025-06-01T13:00:00.000Z',
      finishedAt: '2025-06-01T13:10:00.000Z',
      duration: 600,
    },
    {
      id: '3',
      status: RunStatus.RUNNING,
      startedAt: '2025-06-01T14:00:00.000Z',
      finishedAt: null,
      duration: null,
    },
  ],
  definition: {
    steps: [],
  },
  createdBy: {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
  },
  createdAt: '2025-06-01T12:00:00.000Z',
  updatedAt: '2025-06-01T09:20:00.000Z',
};

export interface GetWorkflowsParams {
  limit: number;
  offset: number;
}

export const WorkflowsManagementApi = {
  getWorkflows: async (params: GetWorkflowsParams): Promise<WorkflowListDTO> => {
    return Promise.resolve({
      results: [
        {
          id: mockWorkflow.id,
          name: mockWorkflow.name,
          description: mockWorkflow.description,
          triggers: mockWorkflow.triggers,
          tags: mockWorkflow.tags,
          enabled: mockWorkflow.enabled,
          runHistory: mockWorkflow.runHistory,
        },
      ],
      _pagination: {
        limit: 10,
        offset: 0,
        total: 1,
      },
    });
  },
  getWorkflow: async (id: string): Promise<WorkflowDetailDTO> => {
    return Promise.resolve(mockWorkflow);
  },
};
