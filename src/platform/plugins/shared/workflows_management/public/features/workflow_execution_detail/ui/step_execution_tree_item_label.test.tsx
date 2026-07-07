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
import { I18nProvider } from '@kbn/i18n-react';
import { ExecutionStatus } from '@kbn/workflows';
import {
  StepExecutionTreeItemLabel,
  type StepExecutionTreeItemLabelProps,
} from './step_execution_tree_item_label';

const renderWithIntl = (props: StepExecutionTreeItemLabelProps) =>
  render(
    <I18nProvider>
      <StepExecutionTreeItemLabel {...props} />
    </I18nProvider>
  );

describe('StepExecutionTreeItemLabel', () => {
  const defaultProps: StepExecutionTreeItemLabelProps = {
    stepId: 'my_step',
    status: ExecutionStatus.COMPLETED,
    executionTimeMs: 1500,
    selected: false,
  };

  it('renders the step name', () => {
    renderWithIntl(defaultProps);
    expect(screen.getByTestId('workflowStepName')).toHaveTextContent('my_step');
  });

  it('renders the execution duration when status is not WAITING_FOR_INPUT', () => {
    renderWithIntl(defaultProps);
    // 1500ms = 1s (formatDuration may include trailing space)
    expect(screen.getByText(/1s/)).toBeInTheDocument();
  });

  it('does not render execution duration when status is WAITING_FOR_INPUT', () => {
    renderWithIntl({ ...defaultProps, status: ExecutionStatus.WAITING_FOR_INPUT });
    expect(screen.queryByText(/1s/)).not.toBeInTheDocument();
  });

  it('renders action required badge when status is WAITING_FOR_INPUT and not Overview pseudo-step', () => {
    renderWithIntl({
      ...defaultProps,
      stepId: 'some_step',
      status: ExecutionStatus.WAITING_FOR_INPUT,
    });
    expect(screen.getByTestId('actionRequiredBadge')).toBeInTheDocument();
    expect(screen.getByTestId('actionRequiredBadge')).toHaveTextContent('Action is required');
  });

  it('does not render action required badge for the Overview pseudo-step', () => {
    renderWithIntl({
      ...defaultProps,
      stepId: 'Overview',
      status: ExecutionStatus.WAITING_FOR_INPUT,
    });
    expect(screen.queryByTestId('actionRequiredBadge')).not.toBeInTheDocument();
  });

  it('appends (skipped) label when status is SKIPPED', () => {
    renderWithIntl({ ...defaultProps, status: ExecutionStatus.SKIPPED });
    const stepName = screen.getByTestId('workflowStepName');
    expect(stepName.parentElement).toHaveTextContent('(skipped)');
  });

  it('does not append (skipped) for non-SKIPPED statuses', () => {
    renderWithIntl({ ...defaultProps, status: ExecutionStatus.COMPLETED });
    expect(screen.getByTestId('workflowStepName').parentElement?.textContent).not.toContain(
      '(skipped)'
    );
  });

  it('does not render execution duration for the trigger pseudo-step', () => {
    renderWithIntl({
      ...defaultProps,
      stepId: 'trigger',
      executionTimeMs: 2000,
    });
    expect(screen.queryByText(/2s/)).not.toBeInTheDocument();
  });

  it('does not render execution duration when executionTimeMs is null', () => {
    renderWithIntl({ ...defaultProps, executionTimeMs: null });
    expect(screen.queryByText(/\ds/)).not.toBeInTheDocument();
  });

  it('renders without a status', () => {
    renderWithIntl({ ...defaultProps, status: undefined });
    expect(screen.getByTestId('workflowStepName')).toHaveTextContent('my_step');
  });

  it('calls onClick when the label is clicked', () => {
    const onClick = jest.fn();
    renderWithIntl({ ...defaultProps, onClick });
    fireEvent.click(screen.getByTestId('workflowStepName'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
