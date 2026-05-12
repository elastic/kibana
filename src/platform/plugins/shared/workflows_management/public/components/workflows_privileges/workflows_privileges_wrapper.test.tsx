/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { WorkflowsPrivilegesWrapper } from './workflows_privileges_wrapper';
import {
  workflowEventNames,
  WorkflowUIEventTypes,
} from '../../common/lib/telemetry/events/workflows';
import { mockWorkflowsManagementCapabilities } from '../../hooks/__mocks__/use_workflows_capabilities';
import { createStartServicesMock } from '../../mocks';

const mockUseKibanaServices = createStartServicesMock();

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: mockUseKibanaServices }),
}));

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useWorkflowsBreadcrumbs: jest.fn(),
}));

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider colorMode="light">{ui}</EuiProvider>
    </I18nProvider>
  );

describe('WorkflowsPrivilegesWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when the user has read privileges', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...mockWorkflowsManagementCapabilities,
      canReadWorkflow: true,
    });

    renderWithProviders(
      <WorkflowsPrivilegesWrapper>
        <div data-test-subj="childContent">{'Workflows content'}</div>
      </WorkflowsPrivilegesWrapper>
    );

    expect(screen.getByTestId('childContent')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowsAccessDeniedEmptyState')).not.toBeInTheDocument();
  });

  it('should render access denied when the user lacks read privileges', async () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...mockWorkflowsManagementCapabilities,
      canReadWorkflow: false,
    });

    renderWithProviders(
      <WorkflowsPrivilegesWrapper>
        <div data-test-subj="childContent">{'Workflows content'}</div>
      </WorkflowsPrivilegesWrapper>
    );

    expect(screen.queryByTestId('childContent')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowsAccessDeniedEmptyState')).toBeInTheDocument();
    expect(screen.getByText('Contact your administrator for access')).toBeInTheDocument();
    expect(
      screen.getByText('To view workflows in this space, you need additional privileges.')
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(mockUseKibanaServices.workflowsManagement.telemetry.reportEvent).toHaveBeenCalledWith(
        WorkflowUIEventTypes.WorkflowAccessDeniedPrivileges,
        expect.objectContaining({
          eventName: workflowEventNames[WorkflowUIEventTypes.WorkflowAccessDeniedPrivileges],
        })
      )
    );
  });

  it('should show required privileges badge in the footer', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...mockWorkflowsManagementCapabilities,
      canReadWorkflow: false,
    });

    renderWithProviders(
      <WorkflowsPrivilegesWrapper>
        <div />
      </WorkflowsPrivilegesWrapper>
    );

    expect(screen.getByText('Minimum privileges required:')).toBeInTheDocument();
    expect(screen.getByText('Workflows: Read')).toBeInTheDocument();
  });
});
