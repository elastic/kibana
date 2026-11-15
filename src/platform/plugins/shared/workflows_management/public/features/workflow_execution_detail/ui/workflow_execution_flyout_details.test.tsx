/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Pins the header, Result card, failed-step focus, pseudo-step and AI behaviour of the flyout that
 * the other flyout test files do not assert. Kept apart from them because their step mocks differ.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionFlyout } from './workflow_execution_flyout';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
} from '../../../shared/test_utils';

jest.mock('../../../entities/workflows/model/use_workflow_execution_polling');

const mockSetSelectedStepExecution = jest.fn();
const mockUrlState: { selectedStepExecutionId: string | undefined } = {
  selectedStepExecutionId: undefined,
};

jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => ({
    selectedStepExecutionId: mockUrlState.selectedStepExecutionId,
    setSelectedStepExecution: mockSetSelectedStepExecution,
  }),
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({
    href: '/app/workflows/workflow-1?executionId=exec-1',
    navigate: jest.fn(),
  }),
}));

jest.mock('../model/use_step_execution', () => ({
  useStepExecution: () => ({
    data: { input: { host: 'web-1' }, output: { result: 'ok' } },
    isLoading: false,
  }),
}));

jest.mock('../model/use_child_workflow_executions', () => ({
  useChildWorkflowExecutions: () => ({ childExecutions: new Map(), isLoading: false }),
}));

const mockUseFetchConnector = jest.fn();
const mockUseAvailableConnectors = jest.fn();
jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: () => mockUseAvailableConnectors(),
  useFetchConnector: (id?: string) => mockUseFetchConnector(id),
}));

jest.mock('../../../entities/service_accounts', () => ({
  ServiceAccountName: ({ id }: { id: string }) => (
    <span data-test-subj="serviceAccountName">{id}</span>
  ),
}));

jest.mock('./execution_take_action_split_button', () => ({
  ExecutionTakeActionSplitButton: () => null,
}));

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="step-icon" />,
}));

jest.mock('./workflow_step_execution_tree', () => ({
  WorkflowStepExecutionTree: ({
    autoExpandErrorForStepId,
    errorArrivalPulseStepId,
  }: {
    autoExpandErrorForStepId: string | null;
    errorArrivalPulseStepId: string | null;
  }) => (
    <div
      data-test-subj="mockStepTree"
      data-auto-expand={autoExpandErrorForStepId ?? ''}
      data-pulse={errorArrivalPulseStepId ?? ''}
    />
  ),
}));

// The step union does not declare `connector-id`; the product reads it off the raw definition.
const connectorBoundStep = {
  name: 'broken_step',
  type: 'console' as const,
  with: { message: 'b' },
  'connector-id': 'conn-1',
};

const definition: WorkflowYaml = {
  version: '1',
  name: 'Test Workflow',
  enabled: true,
  triggers: [],
  steps: [{ name: 'first_step', type: 'console', with: { message: 'a' } }, connectorBoundStep],
};

const failedStep = createMockStepExecutionDto({
  id: 'failed-exec-id',
  stepId: 'broken_step',
  stepType: 'console',
  status: ExecutionStatus.FAILED,
  error: { type: 'Error', message: 'boom' },
});

const setExecution = (overrides: Partial<WorkflowExecutionDto> = {}) => {
  jest.mocked(useWorkflowExecutionPolling).mockReturnValue({
    workflowExecution: createMockWorkflowExecutionDto({
      id: 'exec-1',
      workflowId: 'workflow-1',
      status: ExecutionStatus.COMPLETED,
      workflowDefinition: definition,
      ...overrides,
    }),
    isLoading: false,
    error: null,
  });
};

const renderFlyout = (props: { workflowName?: string; workflowTags?: string[] } = {}) =>
  render(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} {...props} />, {
    wrapper: getTestProvider({}),
  });

describe('WorkflowExecutionFlyout details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUrlState.selectedStepExecutionId = undefined;
    mockUseFetchConnector.mockReturnValue({ data: undefined });
    mockUseAvailableConnectors.mockReturnValue({ connectorTypes: {} });
    setExecution();
  });

  describe('header', () => {
    it('shows the workflow name prop, falling back to the execution name', () => {
      const { unmount } = renderFlyout({ workflowName: 'Prop name' });
      expect(screen.getByRole('heading', { name: 'Prop name' })).toBeInTheDocument();
      unmount();

      renderFlyout();
      expect(screen.getByRole('heading', { name: 'Test Workflow' })).toBeInTheDocument();
    });

    it('shows when the run started', () => {
      renderFlyout();
      expect(screen.getByTestId('workflowExecutionFlyoutStartedAt')).toBeInTheDocument();
    });

    it('shows a Test run badge and the workflow tags', () => {
      setExecution({ isTestRun: true });
      renderFlyout({ workflowTags: ['alpha', 'beta'] });

      expect(screen.getByText('Test run')).toBeInTheDocument();
      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('beta')).toBeInTheDocument();
    });

    it('shows a truncated Step test badge for a step test run', () => {
      const stepId = 'a_very_long_step_name_that_overflows';
      setExecution({ isTestRun: true, stepId });
      renderFlyout();

      expect(screen.getByText(`Step test: ${stepId.slice(0, 24)}…`)).toBeInTheDocument();
      expect(screen.queryByText('Test run')).not.toBeInTheDocument();
    });

    it('shows no badges for a production run without tags', () => {
      renderFlyout();

      expect(screen.queryByText('Test run')).not.toBeInTheDocument();
      expect(screen.queryByText(/^Step test:/)).not.toBeInTheDocument();
    });
  });

  describe('Result card', () => {
    it('shows the status label for a run that did not fail', () => {
      renderFlyout();
      expect(screen.getByTestId('workflowExecutionStatus')).toHaveTextContent('Success');
    });

    it('shows a dash when the run has no duration', () => {
      setExecution({ duration: null });
      renderFlyout();
      expect(screen.getByText('-', { selector: 'p, div' })).toBeInTheDocument();
    });

    it('links to the failed step by position and focuses it on click', () => {
      setExecution({ status: ExecutionStatus.FAILED, stepExecutions: [failedStep] });
      renderFlyout();

      const link = screen.getByTestId('workflowExecutionFlyoutResultLink');
      expect(link).toHaveTextContent('Failed at step 2');
      fireEvent.click(link);

      expect(mockSetSelectedStepExecution).toHaveBeenCalledWith('failed-exec-id');
      expect(screen.getByTestId('mockStepTree')).toHaveAttribute(
        'data-auto-expand',
        'failed-exec-id'
      );
    });

    it('links to a failure it cannot number as plain "Failed"', () => {
      setExecution({
        status: ExecutionStatus.FAILED,
        stepExecutions: [failedStep],
        workflowDefinition: { ...definition, steps: [] },
      });
      renderFlyout();

      expect(screen.getByTestId('workflowExecutionFlyoutResultLink')).toHaveTextContent(/^Failed$/);
    });

    it('shows who the run executes as for a service account', () => {
      setExecution({ effectiveIdentity: { type: 'service_account', id: 'sa-1' } });
      renderFlyout();

      expect(screen.getByTestId('workflowExecutionFlyoutRunAs')).toHaveTextContent('Run as: sa-1');
    });

    it('labels an inherited service account', () => {
      setExecution({
        effectiveIdentity: {
          type: 'service_account',
          id: 'sa-1',
          inheritedFrom: { workloadId: 'parent-workload' },
        },
      });
      renderFlyout();

      expect(screen.getByTestId('workflowExecutionFlyoutRunAs')).toHaveTextContent(
        'Run as (inherited from parent): sa-1'
      );
    });
  });

  describe('failed step focus', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-expands and pulses the failed step on open, then stops pulsing', () => {
      jest.useFakeTimers();
      setExecution({ status: ExecutionStatus.FAILED, stepExecutions: [failedStep] });
      renderFlyout();

      const tree = screen.getByTestId('mockStepTree');
      expect(tree).toHaveAttribute('data-auto-expand', 'failed-exec-id');
      expect(tree).toHaveAttribute('data-pulse', 'failed-exec-id');

      act(() => {
        jest.advanceTimersByTime(1300);
      });

      expect(screen.getByTestId('mockStepTree')).toHaveAttribute('data-pulse', '');
      expect(screen.getByTestId('mockStepTree')).toHaveAttribute(
        'data-auto-expand',
        'failed-exec-id'
      );
    });

    it('does not auto-expand anything for a run that did not fail', () => {
      renderFlyout();

      expect(screen.getByTestId('mockStepTree')).toHaveAttribute('data-auto-expand', '');
    });
  });

  describe('pseudo steps', () => {
    it('shows the trigger metadata without an output section', () => {
      mockUrlState.selectedStepExecutionId = 'trigger';
      renderFlyout();

      expect(screen.getByTestId('workflowStepDataSection_metadata')).toBeInTheDocument();
      expect(screen.getByTestId('workflowStepDataSection_input')).toBeInTheDocument();
      expect(screen.queryByTestId('workflowStepDataSection_output')).not.toBeInTheDocument();
    });

    it('names an if-branch step after its branch and shows no output', () => {
      mockUrlState.selectedStepExecutionId = 'if-branch:then';
      renderFlyout();

      expect(screen.getByRole('heading', { name: 'then' })).toBeInTheDocument();
      expect(screen.queryByTestId('workflowStepDataSection_output')).not.toBeInTheDocument();
    });

    it('says an entered case branch was executed', () => {
      mockUrlState.selectedStepExecutionId = 'enter-case-branch:case_a:0';
      renderFlyout();

      expect(screen.getByTestId('workflowStepDataSection_status')).toHaveTextContent(
        'Branch executed'
      );
    });

    it('says a skipped case branch was not taken', () => {
      mockUrlState.selectedStepExecutionId = 'enter-case-branch:case_a:0:skipped';
      renderFlyout();

      expect(screen.getByTestId('workflowStepDataSection_status')).toHaveTextContent(
        'Branch not taken'
      );
    });

    it('shows an iteration with its rolled-up duration, tokens and item as input', () => {
      mockUrlState.selectedStepExecutionId = 'foreach-iteration:loop:0';
      setExecution({
        stepExecutions: [
          createMockStepExecutionDto({
            id: 'loop-exec-id',
            stepId: 'loop',
            stepType: 'foreach',
            state: { items: ['alpha', 'beta'] },
          }),
          createMockStepExecutionDto({
            id: 'inner-exec-id',
            stepId: 'inner',
            stepType: 'console',
            executionTimeMs: 1500,
            usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
            scopeStack: [
              {
                stepId: 'loop',
                nestedScopes: [
                  { nodeId: 'enterForeach_loop', nodeType: 'enter-foreach', scopeId: '0' },
                ],
              },
            ],
          }),
        ],
      });
      renderFlyout();

      expect(screen.getByRole('heading', { name: 'Iteration #0' })).toBeInTheDocument();
      expect(screen.getByTestId('iterationPseudoStepDuration')).toHaveTextContent('Duration:');
      expect(screen.getByTestId('iterationPseudoStepTokenUsage')).toBeInTheDocument();
      expect(screen.getByTestId('workflowStepDataSection_input')).toBeInTheDocument();
      expect(screen.queryByTestId('workflowStepDataSection_output')).not.toBeInTheDocument();
    });
  });

  describe('AI step details', () => {
    const aiStep = createMockStepExecutionDto({
      id: 'ai-exec-id',
      stepId: 'broken_step',
      stepType: 'console',
      status: ExecutionStatus.COMPLETED,
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });

    beforeEach(() => {
      mockUrlState.selectedStepExecutionId = 'ai-exec-id';
      setExecution({ stepExecutions: [aiStep] });
    });

    it('shows no AI section for a step with neither usage nor a connector', () => {
      setExecution({
        stepExecutions: [{ ...aiStep, stepId: 'first_step', usage: undefined }],
      });
      renderFlyout();

      expect(screen.queryByTestId('workflowExecutionAiSection')).not.toBeInTheDocument();
    });

    it('names the connector and falls back to its default model', () => {
      mockUseFetchConnector.mockReturnValue({
        data: { id: 'conn-1', name: 'Primary', config: { defaultModel: 'model-x' } },
      });
      renderFlyout();

      expect(mockUseFetchConnector).toHaveBeenCalledWith('conn-1');
      expect(screen.getByTestId('workflowExecutionAiSectionModel')).toHaveTextContent('model-x');
      expect(screen.getByTestId('workflowExecutionAiSectionConnector')).toHaveTextContent(
        'Primary'
      );
    });

    it('finds the connector name among the available connectors', () => {
      mockUseAvailableConnectors.mockReturnValue({
        connectorTypes: { '.gen-ai': { instances: [{ id: 'conn-1', name: 'From list' }] } },
      });
      renderFlyout();

      expect(screen.getByTestId('workflowExecutionAiSectionConnector')).toHaveTextContent(
        'From list'
      );
    });

    it('shows the connector id when no name can be found', () => {
      renderFlyout();

      expect(screen.getByTestId('workflowExecutionAiSectionConnector')).toHaveTextContent('conn-1');
    });
  });
});
