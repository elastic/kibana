/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useShowManagedWorkflowsSetting, useWorkflows } from '@kbn/workflows-ui';
import { WorkflowsPage } from '.';
import { TestWrapper } from '../../shared/test_utils/test_wrapper';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useShowManagedWorkflowsSetting: jest.fn(),
    useWorkflows: jest.fn(),
  };
});

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useWorkflowsBreadcrumbs: jest.fn(),
}));

jest.mock('../../entities/workflows/model/use_workflow_stats', () => ({
  useWorkflowFiltersOptions: () => ({
    data: {
      enabled: [],
      createdBy: [],
      tags: [],
    },
  }),
}));

jest.mock('../../features/workflow_list', () => ({
  WorkflowList: () => <div data-test-subj="mockWorkflowListForAuthzTest" />,
}));

const mockUseWorkflows = useWorkflows as jest.MockedFunction<typeof useWorkflows>;
const mockUseShowManagedWorkflowsSetting = useShowManagedWorkflowsSetting as jest.MockedFunction<
  typeof useShowManagedWorkflowsSetting
>;

const emptyWorkflowsResult = {
  data: { results: [], total: 0 },
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
};

const renderPage = () =>
  render(
    <TestWrapper>
      <I18nProvider>
        <EuiProvider colorMode="light">
          <WorkflowsPage />
        </EuiProvider>
      </I18nProvider>
    </TestWrapper>
  );

function mockCapabilities(createWorkflow: boolean, updateWorkflow: boolean): void {
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          workflowsManagement: {
            createWorkflow,
            updateWorkflow,
          },
        },
        navigateToApp: jest.fn(),
      },
      featureFlags: {
        getBooleanValue: () => false,
      },
    },
  } as ReturnType<typeof useKibana>);
}

describe('WorkflowsPage authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflows.mockReturnValue(emptyWorkflowsResult as any);
    mockUseShowManagedWorkflowsSetting.mockReturnValue(false);
  });

  it.each([
    {
      label: 'editor (create + update)',
      createWorkflow: true,
      updateWorkflow: true,
      expectCreate: true,
      expectImport: true,
    },
    {
      label: 'create only (import hidden — needs update too)',
      createWorkflow: true,
      updateWorkflow: false,
      expectCreate: true,
      expectImport: false,
    },
    {
      label: 'update only',
      createWorkflow: false,
      updateWorkflow: true,
      expectCreate: false,
      expectImport: false,
    },
    {
      label: 'read-only',
      createWorkflow: false,
      updateWorkflow: false,
      expectCreate: false,
      expectImport: false,
    },
  ])(
    'header: $label — Create=$expectCreate, Import=$expectImport',
    ({ createWorkflow, updateWorkflow, expectCreate, expectImport }) => {
      mockCapabilities(createWorkflow, updateWorkflow);

      renderPage();

      if (expectCreate) {
        expect(screen.getByTestId('createWorkflowButton')).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('createWorkflowButton')).not.toBeInTheDocument();
      }

      if (expectImport) {
        expect(screen.getByTestId('importWorkflowsButton')).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('importWorkflowsButton')).not.toBeInTheDocument();
      }
    }
  );

  it('hides the managed filter when the setting is disabled', () => {
    mockCapabilities(true, true);
    mockUseWorkflows.mockReturnValue({
      ...emptyWorkflowsResult,
      data: { results: [{}], total: 1 },
    } as any);

    renderPage();

    expect(screen.queryByTestId('managed-filter-popover-button')).not.toBeInTheDocument();
  });

  it('uses the managed filter when the setting is enabled', async () => {
    mockCapabilities(true, true);
    mockUseShowManagedWorkflowsSetting.mockReturnValue(true);
    mockUseWorkflows.mockReturnValue({
      ...emptyWorkflowsResult,
      data: { results: [{}], total: 1 },
    } as any);

    renderPage();

    fireEvent.click(screen.getByTestId('managed-filter-popover-button'));
    fireEvent.click(screen.getByText('True'));

    await waitFor(() => {
      expect(mockUseWorkflows).toHaveBeenLastCalledWith(
        expect.objectContaining({ managed: 'managed' })
      );
    });
  });
});
