/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionDetail } from './workflow_execution_detail';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

jest.mock('./workflow_execution_panel', () => ({
  WorkflowExecutionPanel: () => <div data-test-subj="execution-panel" />,
}));

jest.mock('./workflow_step_execution_details', () => ({
  WorkflowStepExecutionDetails: () => <div data-test-subj="step-details" />,
}));

jest.mock('../model/use_step_execution', () => ({
  useStepExecution: jest.fn(() => ({ data: undefined, isLoading: false })),
}));

const mockSetSelectedStepExecution = jest.fn();
jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: jest.fn(() => ({
    activeTab: 'executions',
    setSelectedStepExecution: mockSetSelectedStepExecution,
    selectedStepExecutionId: '__overview',
  })),
}));

const createMockExecution = (id: string): WorkflowExecutionDto => ({
  spaceId: 'default',
  id,
  status: ExecutionStatus.COMPLETED,
  error: null,
  isTestRun: false,
  startedAt: '2024-01-01T00:00:00Z',
  finishedAt: '2024-01-01T00:01:00Z',
  workflowId: 'workflow-1',
  workflowName: 'Test Workflow',
  workflowDefinition: {
    version: '1',
    name: 'test',
    enabled: true,
    triggers: [],
    steps: [],
  } as WorkflowYaml,
  stepId: undefined,
  stepExecutions: [],
  duration: 60000,
  triggeredBy: 'manual',
  yaml: 'version: "1"',
});

const mockUseWorkflowExecutionPolling = jest.fn((_executionId: string) => ({
  workflowExecution: createMockExecution('exec-1'),
  isLoading: false,
  error: null,
}));
jest.mock('../../../entities/workflows/model/use_workflow_execution_polling', () => ({
  useWorkflowExecutionPolling: (executionId: string) =>
    mockUseWorkflowExecutionPolling(executionId),
}));

describe('WorkflowExecutionDetail - cache invalidation', () => {
  let mockRemoveQueries: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveQueries = jest.fn();
    mockUseQueryClient.mockReturnValue({
      removeQueries: mockRemoveQueries,
    } as any);
  });

  it('should call removeQueries on unmount with the current execution query key', () => {
    const { unmount } = render(
      <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
    );

    expect(mockRemoveQueries).not.toHaveBeenCalled();

    unmount();

    expect(mockRemoveQueries).toHaveBeenCalledWith({
      queryKey: ['stepExecution', 'exec-1'],
    });
  });

  it('should call removeQueries for the previous execution when executionId changes', () => {
    const { rerender } = render(
      <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
    );

    expect(mockRemoveQueries).not.toHaveBeenCalled();

    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: createMockExecution('exec-2'),
      isLoading: false,
      error: null,
    });

    rerender(<WorkflowExecutionDetail executionId="exec-2" onClose={jest.fn()} />);

    expect(mockRemoveQueries).toHaveBeenCalledWith({
      queryKey: ['stepExecution', 'exec-1'],
    });
  });
});
