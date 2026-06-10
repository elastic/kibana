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
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import {
  enrichWorkflowExecutionRowFlattenedValues,
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

const createRow = (source: Partial<EsWorkflowExecution>): DataTableRecord => ({
  id: source.id ?? 'exec-1',
  raw: {
    _id: source.id ?? 'exec-1',
    _source: source,
  } as EsHitRecord,
  flattened: {},
});

describe('enrichWorkflowExecutionRowFlattenedValues', () => {
  it('adds workflowId to flattened workflow column for copy support', () => {
    const row = createRow({
      id: 'exec-1',
      workflowId: 'wf-123',
    });

    expect(enrichWorkflowExecutionRowFlattenedValues(row).flattened.workflow).toBe('wf-123');
  });

  it('adds formatted trigger label to flattened triggers column', () => {
    const row = createRow({
      id: 'exec-1',
      triggeredBy: 'manual',
    });

    expect(enrichWorkflowExecutionRowFlattenedValues(row).flattened.triggers).toBe('Manual');
  });

  it('returns the original row when execution source is missing', () => {
    const row: DataTableRecord = {
      id: 'exec-1',
      raw: { _id: 'exec-1' } as DataTableRecord['raw'],
      flattened: {},
    };

    expect(enrichWorkflowExecutionRowFlattenedValues(row)).toBe(row);
  });
});

describe('WorkflowExecutionWorkflowCell', () => {
  const onOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workflow name as a link', () => {
    render(
      <WorkflowExecutionWorkflowCell
        row={createRow({
          id: 'exec-1',
          status: ExecutionStatus.COMPLETED,
          workflowDefinition: {
            name: 'OpenAI entity extraction',
            triggers: [],
            version: '1',
            enabled: false,
            steps: [],
          },
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
    const row = createRow({
      id: 'exec-1',
      status: ExecutionStatus.COMPLETED,
      workflowDefinition: {
        name: 'OpenAI entity extraction',
        triggers: [],
        version: '1',
        enabled: false,
        steps: [],
      },
    });

    render(<WorkflowExecutionWorkflowCell row={row} onOpen={onOpen} />, {
      wrapper: getTestProvider({}),
    });

    fireEvent.click(screen.getByTestId('workflowExecutionWorkflowLink'));
    expect(onOpen).toHaveBeenCalledWith(row);
  });

  it('renders action required badge when status is WAITING_FOR_INPUT', () => {
    render(
      <WorkflowExecutionWorkflowCell
        row={createRow({
          id: 'exec-1',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          workflowDefinition: {
            name: 'OpenAI entity extraction',
            triggers: [],
            version: '1',
            enabled: false,
            steps: [],
          },
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
        row={createRow({
          id: 'exec-1',
          status: ExecutionStatus.RUNNING,
          workflowDefinition: {
            name: 'OpenAI entity extraction',
            triggers: [],
            version: '1',
            enabled: false,
            steps: [],
          },
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
        row={createRow({
          id: 'exec-1',
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
        row={{
          ...createRow({
            id: 'exec-1',
            status: ExecutionStatus.COMPLETED,
          }),
          flattened: { duration: 2200 },
        }}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(screen.getByTestId('workflowExecutionDurationCell')).toHaveTextContent('2s');
  });

  it('renders in progress spinner when duration is missing and execution is not finished', () => {
    render(
      <WorkflowExecutionDurationCell
        row={createRow({
          id: 'exec-1',
          status: ExecutionStatus.RUNNING,
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
        row={createRow({
          id: 'exec-1',
          status: ExecutionStatus.COMPLETED,
        })}
      />,
      { wrapper: getTestProvider({}) }
    );

    expect(container).toBeEmptyDOMElement();
  });
});
