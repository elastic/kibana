/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import {
  EXECUTION_HISTORY_COLUMN_WIDTHS,
  getExecutionHistoryColumns,
} from './workflow_execution_list_columns';

const executedByProfile: UserProfileWithAvatar = {
  uid: 'u_tal',
  enabled: true,
  user: {
    username: 'tal',
    full_name: 'Tal Borenstein',
    email: 'tal.borenstein@elastic.co',
  },
  data: {},
};

const baseExecution: WorkflowExecutionListItemDto = {
  id: 'exec-1',
  spaceId: 'default',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2026-01-01T15:35:00Z',
  finishedAt: '2026-01-01T15:36:00Z',
  error: null,
  duration: 1000,
  workflowId: 'wf-1',
  workflowName: 'Test Workflow',
  executedBy: 'u_tal',
  triggeredBy: 'manual',
};

const renderColumns = (
  execution: WorkflowExecutionListItemDto,
  overrides: Partial<Parameters<typeof getExecutionHistoryColumns>[0]> = {}
) => {
  const columns = getExecutionHistoryColumns({
    euiTheme: {
      colors: { textSubdued: '#666' },
    } as Parameters<typeof getExecutionHistoryColumns>[0]['euiTheme'],
    showExecutor: true,
    executedByUserProfiles: new Map([['u_tal', executedByProfile]]),
    showUnresolvedExecutors: true,
    timeZoneSetting: 'UTC',
    ...overrides,
  });

  return render(
    <EuiThemeProvider>
      <table>
        <tbody>
          <tr>
            {columns.map((col, i) => {
              const field =
                'field' in col ? (col.field as keyof WorkflowExecutionListItemDto) : undefined;
              const value = field ? execution[field] : undefined;
              const node =
                'render' in col && col.render ? col.render(value as never, execution) : null;
              return <td key={i}>{node}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </EuiThemeProvider>
  );
};

describe('execution history columns', () => {
  it('uses fixed widths that leave room for Status/Started/Duration headers', () => {
    expect(EXECUTION_HISTORY_COLUMN_WIDTHS.status).toBe('120px');
    expect(EXECUTION_HISTORY_COLUMN_WIDTHS.started).toBe('120px');
    expect(EXECUTION_HISTORY_COLUMN_WIDTHS.duration).toBe('72px');
  });

  it('orders columns Status → Started → Duration → Executed by', () => {
    const columns = getExecutionHistoryColumns({
      euiTheme: {
        colors: { textSubdued: '#666' },
      } as Parameters<typeof getExecutionHistoryColumns>[0]['euiTheme'],
      showExecutor: true,
      executedByUserProfiles: new Map(),
      showUnresolvedExecutors: true,
      timeZoneSetting: 'UTC',
    });
    expect(columns.map((c) => ('field' in c ? c.field : undefined))).toEqual([
      'status',
      'startedAt',
      'duration',
      'executedBy',
    ]);
  });

  it('renders Success / Failed labels (never Completed / Error)', () => {
    renderColumns({ ...baseExecution, status: ExecutionStatus.COMPLETED });
    expect(screen.getByText('Success')).toBeInTheDocument();

    renderColumns({ ...baseExecution, status: ExecutionStatus.FAILED, id: 'exec-2' });
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('renders a flask for test runs and none for production', () => {
    const { unmount } = renderColumns({ ...baseExecution, isTestRun: false });
    expect(screen.queryByTestId('workflowExecutionListItemRunModeIcon')).not.toBeInTheDocument();
    unmount();

    renderColumns({ ...baseExecution, isTestRun: true });
    expect(screen.getByLabelText('Test run')).toBeInTheDocument();
  });

  it('renders Step test tooltip when stepId is set', () => {
    renderColumns({ ...baseExecution, isTestRun: true, stepId: 'analyze_alerts' });
    expect(screen.getByLabelText('Step test: analyze_alerts')).toBeInTheDocument();
  });

  it('middle-truncates long executed-by principals next to the avatar', () => {
    const longUid = `u_mGBROF_q5bm${'x'.repeat(40)}_A5E_0`;
    renderColumns(
      {
        ...baseExecution,
        executedBy: longUid,
        status: ExecutionStatus.FAILED,
        isTestRun: true,
      },
      {
        executedByUserProfiles: new Map(),
        showUnresolvedExecutors: true,
      }
    );

    const cell = screen.getByTestId('workflowExecutionListExecutedByCell');
    expect(cell).toBeInTheDocument();
    // Name label is present as a sibling of the avatar (not avatar-only).
    expect(cell.textContent).toContain(longUid);
    expect(cell.querySelector('.euiTextTruncate, [class*="euiTextTruncate"]')).toBeTruthy();
    expect(screen.getByTestId('workflowExecutionListDurationCell')).toHaveTextContent('1s');
  });

  it('shows an em-dash duration for running executions', () => {
    renderColumns({
      ...baseExecution,
      status: ExecutionStatus.RUNNING,
      duration: null,
    });
    expect(screen.getByTestId('workflowExecutionListStatusPill')).toHaveTextContent('Running');
    expect(screen.getByTestId('workflowExecutionListDurationCell')).toHaveTextContent('—');
  });

  it('hides unresolved executor labels when showExecutor is false', () => {
    renderColumns(baseExecution, { showExecutor: false });
    expect(screen.queryByText('Tal Borenstein')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionListExecutedByCell')).toHaveTextContent('—');
  });

  it('renders resolved executor display names when showExecutor is true', () => {
    renderColumns(baseExecution, { showExecutor: true });
    expect(screen.getByText('Tal Borenstein')).toBeInTheDocument();
  });
});
