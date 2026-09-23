/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowStepExecutionDetails } from './workflow_step_execution_details';
import { TestWrapper } from '../../../shared/test_utils';

jest.mock('./step_execution_data_view', () => ({
  StepExecutionDataView: ({ mode }: { mode: string }) => (
    <div data-test-subj={`step-execution-data-view-${mode}`} />
  ),
}));

jest.mock('./foreach_iterations_section', () => ({
  ForeachIterationsSection: () => <div data-test-subj="workflowExecutionIterationsSection" />,
}));

jest.mock('./workflow_execution_overview', () => ({
  WorkflowExecutionOverview: () => <div data-test-subj="workflow-execution-overview" />,
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({ navigate: jest.fn(), href: '' }),
}));

const createTriggerStep = (
  overrides: Partial<WorkflowStepExecutionDto> = {}
): WorkflowStepExecutionDto => ({
  id: 'trigger',
  stepId: 'manual',
  stepType: 'trigger_manual',
  status: ExecutionStatus.COMPLETED,
  scopeStack: [],
  workflowRunId: 'exec-1',
  workflowId: 'wf-1',
  startedAt: '',
  globalExecutionIndex: -1,
  stepExecutionIndex: 0,
  topologicalIndex: -1,
  ...overrides,
});

const createRegularStep = (
  overrides: Partial<WorkflowStepExecutionDto> = {}
): WorkflowStepExecutionDto => ({
  id: 'step-1',
  stepId: 'emit',
  stepType: 'workflow.output',
  status: ExecutionStatus.COMPLETED,
  scopeStack: [],
  workflowRunId: 'exec-1',
  workflowId: 'wf-1',
  startedAt: '2024-01-01T00:00:00Z',
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
  topologicalIndex: 0,
  input: {},
  output: {},
  ...overrides,
});

describe('WorkflowStepExecutionDetails', () => {
  it('renders Input and Output sections for a trigger with both payloads', () => {
    const stepExecution = createTriggerStep({
      input: { foo: 'bar' },
      output: { greeting: 'hello world' },
    });
    render(
      <TestWrapper>
        <WorkflowStepExecutionDetails workflowExecutionId="exec-1" stepExecution={stepExecution} />
      </TestWrapper>
    );

    expect(screen.getByTestId('step-execution-data-view-input')).toBeInTheDocument();
    expect(screen.getByTestId('step-execution-data-view-output')).toBeInTheDocument();
  });

  it('renders only Input when output is missing', () => {
    const stepExecution = createTriggerStep({ input: { foo: 'bar' } });
    render(
      <TestWrapper>
        <WorkflowStepExecutionDetails workflowExecutionId="exec-1" stepExecution={stepExecution} />
      </TestWrapper>
    );

    expect(screen.getByTestId('step-execution-data-view-input')).toBeInTheDocument();
    expect(screen.queryByTestId('step-execution-data-view-output')).not.toBeInTheDocument();
  });

  it('renders only Output when input is missing but output exists', () => {
    const stepExecution = createTriggerStep({ output: { result: 'ok' } });
    render(
      <TestWrapper>
        <WorkflowStepExecutionDetails workflowExecutionId="exec-1" stepExecution={stepExecution} />
      </TestWrapper>
    );

    expect(screen.queryByTestId('step-execution-data-view-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('step-execution-data-view-output')).toBeInTheDocument();
  });

  it('renders a trigger without input, output, or error', () => {
    render(
      <TestWrapper>
        <WorkflowStepExecutionDetails
          workflowExecutionId="exec-1"
          stepExecution={createTriggerStep()}
        />
      </TestWrapper>
    );

    expect(screen.queryByTestId('step-execution-data-view-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-execution-data-view-output')).not.toBeInTheDocument();
  });

  it('renders Input then Output for regular steps', () => {
    const stepExecution = createRegularStep({
      input: { url: 'https://example.com' },
      output: { status: 200 },
    });
    render(
      <TestWrapper>
        <WorkflowStepExecutionDetails workflowExecutionId="exec-1" stepExecution={stepExecution} />
      </TestWrapper>
    );

    expect(screen.getByTestId('step-execution-data-view-input')).toBeInTheDocument();
    expect(screen.getByTestId('step-execution-data-view-output')).toBeInTheDocument();
  });

  it('renders Iterations for foreach without inventing an Output section', () => {
    const foreachStep = createRegularStep({
      id: 'foreach-1',
      stepId: 'loop',
      stepType: 'foreach',
      input: { items: [1] },
      output: undefined,
    });
    const child = createRegularStep({
      id: 'child-1',
      stepId: 'inner',
      scopeStack: [
        {
          stepId: 'loop',
          nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '0' }],
        },
      ],
    });
    render(
      <TestWrapper>
        <WorkflowStepExecutionDetails
          workflowExecutionId="exec-1"
          stepExecution={foreachStep}
          allStepExecutions={[foreachStep, child]}
          onSelectStepExecution={jest.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId('workflowExecutionIterationsSection')).toBeInTheDocument();
    expect(screen.getByTestId('step-execution-data-view-input')).toBeInTheDocument();
    expect(screen.queryByTestId('step-execution-data-view-output')).not.toBeInTheDocument();
  });

  it('renders with workflowExecutionTrigger data-test-subj for trigger pseudo-step', () => {
    const stepExecution = createTriggerStep({ input: {} });
    const { container } = render(
      <TestWrapper>
        <WorkflowStepExecutionDetails workflowExecutionId="exec-1" stepExecution={stepExecution} />
      </TestWrapper>
    );
    expect(
      container.querySelector('[data-test-subj="workflowExecutionTrigger"]')
    ).toBeInTheDocument();
  });

  it('renders with workflowStepExecutionDetails data-test-subj for regular step', () => {
    const stepExecution = createRegularStep();
    const { container } = render(
      <TestWrapper>
        <WorkflowStepExecutionDetails workflowExecutionId="exec-1" stepExecution={stepExecution} />
      </TestWrapper>
    );
    expect(
      container.querySelector('[data-test-subj="workflowStepExecutionDetails"]')
    ).toBeInTheDocument();
  });
});
