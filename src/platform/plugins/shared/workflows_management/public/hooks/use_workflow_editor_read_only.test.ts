/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import { useWorkflowEditorReadOnly } from './use_workflow_editor_read_only';
import { createMockStore } from '../entities/workflows/store/__mocks__/store.mock';
import {
  setActiveTab,
  setExecution,
  setWorkflow,
} from '../entities/workflows/store/workflow_detail/slice';
import { getTestProvider } from '../shared/mocks/test_providers';

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
}));

const { useWorkflowsCapabilities } = jest.requireMock('@kbn/workflows-ui') as {
  useWorkflowsCapabilities: jest.Mock;
};

const EXECUTION_ID = 'execution-1';

const baseWorkflow: WorkflowDetailDto = {
  id: 'workflow-1',
  name: 'My workflow',
  yaml: 'name: committed\n',
  enabled: true,
  createdAt: '2026-06-01T00:00:00.000Z',
  createdBy: 'user-1',
  lastUpdatedAt: '2026-06-16T00:00:00.000Z',
  lastUpdatedBy: 'user-1',
  definition: null,
  valid: true,
};

const baseExecution = {
  spaceId: 'default',
  id: EXECUTION_ID,
  status: ExecutionStatus.COMPLETED,
  isTestRun: true,
  startedAt: '2026-06-16T00:00:00.000Z',
  finishedAt: '2026-06-16T00:00:01.000Z',
  error: null,
  workflowId: baseWorkflow.id,
  workflowDefinition: {} as WorkflowExecutionDto['workflowDefinition'],
  stepExecutions: [],
  duration: 1000,
  yaml: 'name: snapshot\n',
} satisfies WorkflowExecutionDto;

interface RenderParams {
  /** Search string appended to the editor route, e.g. `?tab=executions&executionId=x`. */
  search?: string;
  activeTab?: 'workflow' | 'executions';
  execution?: WorkflowExecutionDto;
  workflow?: WorkflowDetailDto;
}

const renderReadOnlyHook = ({
  search = '',
  activeTab = 'workflow',
  execution,
  workflow = baseWorkflow,
}: RenderParams = {}) => {
  const store = createMockStore();
  store.dispatch(setWorkflow(workflow));
  store.dispatch(setActiveTab(activeTab));
  if (execution) {
    store.dispatch(setExecution(execution));
  }

  return renderHook(() => useWorkflowEditorReadOnly(), {
    wrapper: getTestProvider({ store, initialEntries: [`/workflows/${workflow.id}${search}`] }),
  });
};

describe('useWorkflowEditorReadOnly', () => {
  beforeEach(() => {
    useWorkflowsCapabilities.mockReturnValue({
      canCreateWorkflow: true,
      canUpdateWorkflow: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is editable on the workflow tab with no execution selected', () => {
    const { result } = renderReadOnlyHook();

    expect(result.current).toBe(false);
  });

  it('stays editable when a test execution is running on the workflow tab', () => {
    // Running a test from the editor puts an executionId in the URL so the execution panel can
    // follow along, but the editor must remain editable.
    const { result } = renderReadOnlyHook({
      search: `?executionId=${EXECUTION_ID}`,
      activeTab: 'workflow',
      execution: baseExecution,
    });

    expect(result.current).toBe(false);
  });

  it('is read-only when an execution is selected on the executions tab', () => {
    const { result } = renderReadOnlyHook({
      search: `?tab=executions&executionId=${EXECUTION_ID}`,
      activeTab: 'executions',
      execution: baseExecution,
    });

    expect(result.current).toBe(true);
  });

  it('is read-only on the executions tab before the execution snapshot has loaded', () => {
    const { result } = renderReadOnlyHook({
      search: `?tab=executions&executionId=${EXECUTION_ID}`,
      activeTab: 'executions',
    });

    expect(result.current).toBe(true);
  });

  it('is read-only on the executions tab with no execution selected', () => {
    const { result } = renderReadOnlyHook({
      search: '?tab=executions',
      activeTab: 'executions',
    });

    expect(result.current).toBe(true);
  });

  it('is read-only for a managed workflow', () => {
    const { result } = renderReadOnlyHook({
      workflow: { ...baseWorkflow, managed: true },
    });

    expect(result.current).toBe(true);
  });

  it('is read-only when the user cannot create or update workflows', () => {
    useWorkflowsCapabilities.mockReturnValue({
      canCreateWorkflow: false,
      canUpdateWorkflow: false,
    });

    const { result } = renderReadOnlyHook();

    expect(result.current).toBe(true);
  });
});
