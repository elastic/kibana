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
import { useLocation } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils';

const mockUseWorkflowsCapabilities = jest.fn(() => ({
  canExecuteWorkflow: true,
  canUpdateWorkflow: true,
}));

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
  };
});

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({ href: '/app/workflows/wf-1?executionId=exec-1' }),
}));

const LocationSearch = () => {
  const { search } = useLocation();
  return <div data-test-subj="location-search">{search}</div>;
};

describe('ExecutionTakeActionSplitButton', () => {
  const execution = createMockWorkflowExecutionDto({
    id: 'exec-1',
    workflowId: 'wf-1',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue({
      canExecuteWorkflow: true,
      canUpdateWorkflow: true,
    });
  });

  it('opens the replay modal without closing the current execution', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton execution={execution} />
        <LocationSearch />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/wf-1?tab=executions&executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(search).toContain('executionId=exec-1');
    expect(search).toContain('replayExecutionId=exec-1');
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('navigates to the workflow replay modal from another route', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton execution={execution} />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/executions?executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    expect(navigateToApp).toHaveBeenCalledWith('workflows', {
      path: '/wf-1?tab=executions&executionId=exec-1&replayExecutionId=exec-1',
    });
  });

  it('does not open the replay modal without execute privilege', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;
    mockUseWorkflowsCapabilities.mockReturnValue({
      canExecuteWorkflow: false,
      canUpdateWorkflow: true,
    });

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton execution={execution} />
        <LocationSearch />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/wf-1?tab=executions&executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    expect(navigateToApp).not.toHaveBeenCalled();
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('replayExecutionId');
  });

  it('opens the replay modal when the workflow route has a trailing slash', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton execution={execution} />
        <LocationSearch />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/wf-1/?tab=executions&executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(search).toContain('replayExecutionId=exec-1');
    expect(navigateToApp).not.toHaveBeenCalled();
  });
});
