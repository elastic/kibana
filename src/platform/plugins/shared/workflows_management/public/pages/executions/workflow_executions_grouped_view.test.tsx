/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import { WorkflowExecutionsGroupedView } from './workflow_executions_grouped_view';
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

const renderGroupedView = (executions: WorkflowExecutionListItemDto[]) =>
  render(
    <WorkflowExecutionsGroupedView
      executions={executions}
      groupBy="workflow"
      onOpenExecution={jest.fn()}
    />,
    { wrapper: getTestProvider({}) }
  );

describe('WorkflowExecutionsGroupedView', () => {
  it('renders Alerts-style group headers collapsed by default with stats on the right', () => {
    const executions = [
      createExecution({ id: '1', workflowId: 'wf-a', workflowName: 'Alpha' }),
      createExecution({ id: '2', workflowId: 'wf-a', workflowName: 'Alpha' }),
      createExecution({ id: '3', workflowId: 'wf-b', workflowName: 'Beta' }),
    ];

    renderGroupedView(executions);

    expect(screen.getByTestId('executionsTableGroupSummary')).toHaveTextContent(
      '3 executions | 2 groups'
    );

    const alphaGroup = screen.getByTestId('executionsTableGroup-wf-a');
    expect(within(alphaGroup).getByTestId('executionsTableGroupHeader')).toHaveTextContent('Alpha');
    expect(within(alphaGroup).getByTestId('executionsTableGroupStats')).toHaveTextContent(
      'Executions'
    );
    expect(within(alphaGroup).getByTestId('executionsTableGroupCount')).toHaveTextContent('2');
    expect(screen.queryByText('Alpha', { selector: 'td' })).not.toBeInTheDocument();
  });

  it('expands one group at a time and mounts the nested table only when open', () => {
    const executions = [
      createExecution({ id: '1', workflowId: 'wf-a', workflowName: 'Alpha' }),
      createExecution({ id: '2', workflowId: 'wf-b', workflowName: 'Beta' }),
    ];

    renderGroupedView(executions);

    fireEvent.click(within(screen.getByTestId('executionsTableGroup-wf-a')).getByRole('button'));
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(
      within(screen.getByTestId('executionsTableGroup-wf-a')).getByRole('table')
    ).toBeInTheDocument();

    fireEvent.click(within(screen.getByTestId('executionsTableGroup-wf-b')).getByRole('button'));
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(
      within(screen.getByTestId('executionsTableGroup-wf-b')).getByRole('table')
    ).toBeInTheDocument();
  });
});
