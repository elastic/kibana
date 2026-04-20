/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { mockWorkflowsManagementCapabilities } from './hooks/__mocks__/use_workflows_capabilities';
import { WorkflowsReadPermissionsWrapper } from './routes';

jest.mock('./pages/workflow_detail', () => ({
  WorkflowDetailPage: () => <div data-test-subj="mockWorkflowDetailPage" />,
}));
jest.mock('./pages/workflows', () => ({
  WorkflowsPage: () => <div data-test-subj="mockWorkflowsPage" />,
}));
jest.mock('./entities/workflows/store/provider', () => ({
  WorkflowDetailStoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
}));

jest.mock('./hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useWorkflowsBreadcrumbs: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: { prepend: (p: string) => `/base${p}` },
      },
    },
  }),
}));

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;

const renderWithEui = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider colorMode="light">{ui}</EuiProvider>
    </I18nProvider>
  );

describe('WorkflowsReadPermissionsWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders AccessDenied when canReadWorkflow is false', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...mockWorkflowsManagementCapabilities,
      canReadWorkflow: false,
    });

    renderWithEui(
      <WorkflowsReadPermissionsWrapper>
        <div data-test-subj="secretChild">{'Secret'}</div>
      </WorkflowsReadPermissionsWrapper>
    );

    expect(screen.getByTestId('workflowsNoReadAccessEmptyState')).toBeInTheDocument();
    expect(screen.queryByTestId('secretChild')).not.toBeInTheDocument();
  });

  it('renders children when canReadWorkflow is true', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...mockWorkflowsManagementCapabilities,
      canReadWorkflow: true,
    });

    renderWithEui(
      <WorkflowsReadPermissionsWrapper>
        <div data-test-subj="secretChild">{'Secret'}</div>
      </WorkflowsReadPermissionsWrapper>
    );

    expect(screen.queryByTestId('workflowsNoReadAccessEmptyState')).not.toBeInTheDocument();
    expect(screen.getByTestId('secretChild')).toBeInTheDocument();
  });
});
