import { WorkflowExecutionStatus } from '@kbn/workflows';
import { WorkflowDetailDto, WorkflowListDto } from '../../common/workflows/models/types';

const mockWorkflow: WorkflowDetailDto = {
  id: '1',
  name: 'JAMF Enrollment Reminder',
  description: 'Check if the user has enrolled in JAMF, reminds in Slack if not every 7 days.',
  triggers: [
    {
      type: 'schedule',
      id: '1',
    },
  ],
  tags: ['InfoSec', 'Slack'],
  enabled: true,
  runHistory: Array.from({ length: 14 }, (_, i) => ({
    id: i.toString(),
    status:
      i === 13
        ? WorkflowExecutionStatus.RUNNING
        : i % 5 === 0
        ? WorkflowExecutionStatus.FAILED
        : WorkflowExecutionStatus.SUCCESS,
    startedAt: new Date(2025, 0, 1, 12, 0, 0 + i, 0).toISOString(),
    finishedAt: new Date(2025, 0, 1, 12, 0, 1 + i, 0).toISOString(),
    duration: i % 2 === 0 ? 5 : i % 3 === 1 ? 2 : 1,
  })),
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
  getWorkflows: async (params: GetWorkflowsParams): Promise<WorkflowListDto> => {
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
  getWorkflow: async (id: string): Promise<WorkflowDetailDto> => {
    return Promise.resolve(mockWorkflow);
  },
};
