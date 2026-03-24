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
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionOverview } from './workflow_execution_overview';

const renderWithIntl = (component: React.ReactElement) => {
  return render(component, { wrapper: I18nProvider });
};

jest.mock('./step_execution_data_view', () => ({
  StepExecutionDataView: ({ stepExecution, mode }: any) => (
    <div data-test-subj="mocked-step-execution-data-view">
      {`Mode: ${mode}, Step: ${stepExecution.stepId}`}
    </div>
  ),
}));

jest.mock('../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced', () => ({
  FormattedRelativeEnhanced: ({ value }: { value: string }) => (
    <span data-test-subj="formatted-relative">{value}</span>
  ),
}));

const createMockStepExecution = (
  overrides?: Partial<WorkflowStepExecutionDto>
): WorkflowStepExecutionDto => ({
  id: '__overview',
  stepId: 'Overview',
  stepType: '__overview',
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  startedAt: '2024-01-15T10:30:45.123Z',
  input: {
    execution: {
      id: 'exec-123',
      isTestRun: false,
      startedAt: '2024-01-15T10:30:45.123Z',
      url: 'http://localhost',
    },
    now: '2024-01-15T10:35:50.456Z',
    workflow: {
      id: 'workflow-1',
      name: 'Test Workflow',
      enabled: true,
      spaceId: 'default',
    },
    kibanaUrl: 'http://localhost',
  },
  scopeStack: [],
  workflowRunId: 'run-123',
  workflowId: 'workflow-1',
  topologicalIndex: -1,
  globalExecutionIndex: -1,
  ...overrides,
});

describe('WorkflowExecutionOverview', () => {
  describe('rendering', () => {
    it('should render the component with execution data', () => {
      const stepExecution = createMockStepExecution();
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByTestId('mocked-step-execution-data-view')).toBeInTheDocument();
    });

    it('should render StepExecutionDataView with correct props', () => {
      const stepExecution = createMockStepExecution();
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      const dataView = screen.getByTestId('mocked-step-execution-data-view');
      expect(dataView.textContent).toContain('Mode: input');
      expect(dataView.textContent).toContain('Step: Overview');
    });
  });

  describe('status display', () => {
    it.each([
      [ExecutionStatus.COMPLETED, 'Success'],
      [ExecutionStatus.RUNNING, 'Running'],
      [ExecutionStatus.FAILED, 'Error'],
      [ExecutionStatus.PENDING, 'Pending'],
      [ExecutionStatus.CANCELLED, 'Canceled'],
    ])('should display correct status label for %s', (status, expectedLabel) => {
      const stepExecution = createMockStepExecution({ status });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  describe('test run badge', () => {
    it('should display test run badge when isTestRun is true', () => {
      const stepExecution = createMockStepExecution({
        input: {
          execution: {
            id: 'exec-123',
            isTestRun: true,
            startedAt: '2024-01-15T10:30:45.123Z',
            url: 'http://localhost',
          },
        },
      });
      const { container } = renderWithIntl(
        <WorkflowExecutionOverview stepExecution={stepExecution} />
      );

      const beakerIcon = container.querySelector('[data-euiicon-type="beaker"]');
      expect(beakerIcon).toBeInTheDocument();
    });

    it('should not display test run badge when isTestRun is false', () => {
      const stepExecution = createMockStepExecution({
        input: {
          execution: {
            id: 'exec-123',
            isTestRun: false,
            startedAt: '2024-01-15T10:30:45.123Z',
            url: 'http://localhost',
          },
        },
      });
      const { container } = renderWithIntl(
        <WorkflowExecutionOverview stepExecution={stepExecution} />
      );

      const beakerIcon = container.querySelector('[data-euiicon-type="beaker"]');
      expect(beakerIcon).not.toBeInTheDocument();
    });

    it('should not display test run badge when execution context is missing', () => {
      const stepExecution = createMockStepExecution({
        input: undefined,
      });
      const { container } = renderWithIntl(
        <WorkflowExecutionOverview stepExecution={stepExecution} />
      );

      const beakerIcon = container.querySelector('[data-euiicon-type="beaker"]');
      expect(beakerIcon).not.toBeInTheDocument();
    });
  });

  describe('duration display', () => {
    it('should display duration when provided', () => {
      const stepExecution = createMockStepExecution();
      renderWithIntl(
        <WorkflowExecutionOverview stepExecution={stepExecution} workflowExecutionDuration={5000} />
      );

      expect(screen.getByText('5s')).toBeInTheDocument();
    });

    it('should display duration in milliseconds for short durations', () => {
      const stepExecution = createMockStepExecution();
      renderWithIntl(
        <WorkflowExecutionOverview stepExecution={stepExecution} workflowExecutionDuration={500} />
      );

      expect(screen.getByText('500ms')).toBeInTheDocument();
    });

    it('should not display duration when not provided', () => {
      const stepExecution = createMockStepExecution();
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      const clockIcons = screen.queryAllByTestId('euiIcon').filter((icon) => {
        return icon.getAttribute('data-euiicon-type') === 'clock';
      });
      expect(clockIcons).toHaveLength(0);
    });

    it('should not display duration when zero', () => {
      const stepExecution = createMockStepExecution();
      renderWithIntl(
        <WorkflowExecutionOverview stepExecution={stepExecution} workflowExecutionDuration={0} />
      );

      const clockIcons = screen.queryAllByTestId('euiIcon').filter((icon) => {
        return icon.getAttribute('data-euiicon-type') === 'clock';
      });
      expect(clockIcons).toHaveLength(0);
    });
  });

  describe('date formatting', () => {
    it('should format execution started date with milliseconds', () => {
      const stepExecution = createMockStepExecution({
        startedAt: '2024-01-15T10:30:45.123Z',
      });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      const dateText = screen.getByText(/.*15.*2024.*45\.123/);
      expect(dateText).toBeInTheDocument();
    });

    it('should format execution ended date with milliseconds', () => {
      const stepExecution = createMockStepExecution({
        input: {
          now: '2024-01-15T10:35:50.456Z',
        },
      });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      const dateText = screen.getByText(/.*15.*2024.*50\.456/);
      expect(dateText).toBeInTheDocument();
    });

    it('should display relative time for started date', () => {
      const stepExecution = createMockStepExecution({
        startedAt: '2024-01-15T10:30:45.123Z',
      });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      const relativeTime = screen.getByTestId('formatted-relative');
      expect(relativeTime).toHaveTextContent('2024-01-15T10:30:45.123Z');
    });
  });

  describe('edge cases', () => {
    it('should handle missing startedAt gracefully', () => {
      const stepExecution = createMockStepExecution({
        startedAt: '',
      });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByText('Execution started')).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return element?.tagName === 'STRONG' && content === '-';
        })
      ).toBeInTheDocument();
    });

    it('should handle missing execution ended date gracefully', () => {
      const stepExecution = createMockStepExecution({
        input: {
          execution: {
            id: 'exec-123',
            isTestRun: false,
            startedAt: '2024-01-15T10:30:45.123Z',
            url: 'http://localhost',
          },
        },
      });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByText('Execution ended')).toBeInTheDocument();
      const strongElements = screen.getAllByText((content, element) => {
        return element?.tagName === 'STRONG' && content === '-';
      });
      expect(strongElements.length).toBeGreaterThan(0);
    });

    it('should handle missing input context', () => {
      const stepExecution = createMockStepExecution({
        input: undefined,
      });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByTestId('mocked-step-execution-data-view')).toBeInTheDocument();
    });

    it('should handle missing execution context within input', () => {
      const stepExecution = createMockStepExecution({
        input: {
          someOtherField: 'value',
        },
      });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByTestId('mocked-step-execution-data-view')).toBeInTheDocument();
    });

    it('should handle undefined values in context', () => {
      const stepExecution = createMockStepExecution({
        input: {},
      });
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByTestId('mocked-step-execution-data-view')).toBeInTheDocument();
    });
  });

  describe('i18n labels', () => {
    it('should display execution started label', () => {
      const stepExecution = createMockStepExecution();
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByText('Execution started')).toBeInTheDocument();
    });

    it('should display execution ended label', () => {
      const stepExecution = createMockStepExecution();
      renderWithIntl(<WorkflowExecutionOverview stepExecution={stepExecution} />);

      expect(screen.getByText('Execution ended')).toBeInTheDocument();
    });
  });
});
