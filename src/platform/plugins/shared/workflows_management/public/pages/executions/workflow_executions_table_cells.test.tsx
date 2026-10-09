/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import {
  WorkflowExecutionDurationCell,
  WorkflowExecutionStartedAtCell,
  WorkflowExecutionWorkflowCell,
} from './workflow_executions_table_cells';
import { getTestProvider } from '../../shared/mocks/test_providers';

jest.mock('../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced', () => ({
  FormattedRelativeEnhanced: ({ value }: { value: Date }) => <span>{value.toISOString()}</span>,
}));

jest.mock('../../shared/ui/use_formatted_date', () => ({
  useGetFormattedDateTime: () => (date: Date) => date.toISOString(),
}));

const createExecution = (
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto => ({
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2026-01-01T00:00:00Z',
  finishedAt: '2026-01-01T00:00:03Z',
  duration: 3000,
  error: null,
  ...overrides,
});

describe('WorkflowExecutionWorkflowCell', () => {
  const onOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workflow name as a link', () => {
    render(
      <WorkflowExecutionWorkflowCell
        execution={createExecution({
          status: ExecutionStatus.COMPLETED,
          workflowName: 'OpenAI entity extraction',
        })}
        onOpen={onOpen}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(screen.getByTestId('workflowExecutionWorkflowLink')).toHaveTextContent(
      'OpenAI entity extraction'
    );
  });

  it('opens execution details when workflow link is clicked', () => {
    const execution = createExecution({
      status: ExecutionStatus.COMPLETED,
      workflowName: 'OpenAI entity extraction',
    });

    render(<WorkflowExecutionWorkflowCell execution={execution} onOpen={onOpen} />, {
      wrapper: getTestProvider({}),
    });

    fireEvent.click(screen.getByTestId('workflowExecutionWorkflowLink'));
    expect(onOpen).toHaveBeenCalledWith(execution);
  });

  it('renders action required badge when status is WAITING_FOR_INPUT', () => {
    render(
      <WorkflowExecutionWorkflowCell
        execution={createExecution({
          status: ExecutionStatus.WAITING_FOR_INPUT,
          workflowName: 'OpenAI entity extraction',
        })}
        onOpen={onOpen}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(screen.getByTestId('workflowExecutionActionRequiredBadge')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionActionRequiredBadge')).toHaveTextContent(
      'Action is required'
    );
  });

  it('does not render action required badge for other statuses', () => {
    render(
      <WorkflowExecutionWorkflowCell
        execution={createExecution({
          status: ExecutionStatus.RUNNING,
          workflowName: 'OpenAI entity extraction',
        })}
        onOpen={onOpen}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(screen.queryByTestId('workflowExecutionActionRequiredBadge')).not.toBeInTheDocument();
  });
});

describe('WorkflowExecutionStartedAtCell', () => {
  it('renders relative started time with full date tooltip content', () => {
    const startedAt = '2026-01-01T00:00:00Z';

    render(
      <WorkflowExecutionStartedAtCell
        execution={createExecution({
          status: ExecutionStatus.COMPLETED,
          startedAt,
        })}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(screen.getByTestId('workflowExecutionStartedAtCell')).toHaveTextContent(
      new Date(startedAt).toISOString()
    );
  });
});

describe('WorkflowExecutionDurationCell', () => {
  it('renders formatted duration when available', () => {
    render(
      <WorkflowExecutionDurationCell
        execution={createExecution({
          status: ExecutionStatus.COMPLETED,
          duration: 2200,
        })}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(screen.getByTestId('workflowExecutionDurationCell')).toHaveTextContent('2s');
  });

  it('renders in progress spinner when duration is missing and execution is not finished', () => {
    render(
      <WorkflowExecutionDurationCell
        execution={createExecution({
          status: ExecutionStatus.RUNNING,
          duration: null,
        })}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(screen.getByTestId('workflowExecutionDurationInProgress')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowExecutionDurationCell')).not.toBeInTheDocument();
  });

  it('renders nothing when duration is missing and execution is finished', () => {
    const { container } = render(
      <WorkflowExecutionDurationCell
        execution={createExecution({
          status: ExecutionStatus.COMPLETED,
          duration: null,
        })}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(container).toBeEmptyDOMElement();
  });
});
