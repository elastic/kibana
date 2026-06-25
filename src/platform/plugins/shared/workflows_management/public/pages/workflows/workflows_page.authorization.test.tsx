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
import userEvent from '@testing-library/user-event';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useWorkflows } from '@kbn/workflows-ui';
import { WorkflowsPage } from '.';
import { PLUGIN_ID } from '../../../common';
import { TestWrapper } from '../../shared/test_utils/test_wrapper';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseWorkflowFiltersOptions = jest.fn();

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useWorkflows: jest.fn(),
  };
});

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useWorkflowsBreadcrumbs: jest.fn(),
}));

jest.mock('../../entities/workflows/model/use_workflow_stats', () => ({
  useWorkflowFiltersOptions: (...args: unknown[]) => mockUseWorkflowFiltersOptions(...args),
}));

jest.mock('../../features/workflow_list', () => ({
  WorkflowList: () => <div data-test-subj="mockWorkflowListForAuthzTest" />,
}));

jest.mock('../../widgets/workflow_search_field/ui/workflow_search_field', () => ({
  WorkflowSearchField: ({ onSearch }: { onSearch: (query: string) => void }) => (
    <button type="button" data-test-subj="workflowSearchField" onClick={() => onSearch('security')}>
      {'Search workflows'}
    </button>
  ),
}));

jest.mock('../../widgets/workflow_filter_popover/workflow_filter_popover', () => ({
  WorkflowsFilterPopover: ({
    filter,
    title,
    onSelectedValuesChanged,
  }: {
    filter: string;
    title: string;
    onSelectedValuesChanged: (newValues: Array<string | boolean>) => void;
  }) => {
    const valuesByFilter: Record<string, Array<string | boolean>> = {
      enabled: ['false'],
      createdBy: ['alice'],
      tags: ['prod'],
    };

    return (
      <button
        type="button"
        data-test-subj={`${filter}-filter-popover-button`}
        onClick={() => onSelectedValuesChanged(valuesByFilter[filter] ?? [])}
      >
        {title}
      </button>
    );
  },
}));

const mockUseWorkflows = useWorkflows as jest.MockedFunction<typeof useWorkflows>;
let mockNavigateToApp: jest.Mock;

const emptyWorkflowsResult = {
  data: { results: [], total: 0 },
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
};

const nonEmptyWorkflowsResult = {
  data: { results: [], total: 1 },
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
};

const renderPage = (routerHistory?: React.ComponentProps<typeof TestWrapper>['routerHistory']) =>
  render(
    <TestWrapper routerHistory={routerHistory}>
      <I18nProvider>
        <EuiProvider colorMode="light">
          <WorkflowsPage />
        </EuiProvider>
      </I18nProvider>
    </TestWrapper>
  );

function mockCapabilities(createWorkflow: boolean, updateWorkflow: boolean): void {
  mockNavigateToApp = jest.fn();
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          workflowsManagement: {
            createWorkflow,
            updateWorkflow,
          },
        },
        navigateToApp: mockNavigateToApp,
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
    mockUseWorkflowFiltersOptions.mockReturnValue({
      data: {
        enabled: [],
        createdBy: [],
        tags: [],
      },
    });
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

  describe('pagination reset', () => {
    beforeEach(() => {
      mockCapabilities(true, true);
      mockUseWorkflows.mockReturnValue(nonEmptyWorkflowsResult as any);
    });

    it('resets page to 1 when the query changes', async () => {
      const user = userEvent.setup();

      renderPage(['/?page=3']);

      await user.click(screen.getByTestId('workflowSearchField'));

      expect(mockNavigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
        path: '?query=security',
        replace: true,
      });
    });

    it.each([
      ['enabled', '?enabled=false'],
      ['createdBy', '?createdBy=alice'],
      ['tags', '?tags=prod'],
    ])('resets page to 1 when the %s filter changes', async (filter, expectedPath) => {
      const user = userEvent.setup();

      renderPage(['/?page=3']);

      await user.click(screen.getByTestId(`${filter}-filter-popover-button`));

      expect(mockNavigateToApp).toHaveBeenCalledWith(PLUGIN_ID, {
        path: expectedPath,
        replace: true,
      });
    });
  });

  describe('filter options scope', () => {
    beforeEach(() => {
      mockCapabilities(true, true);
      mockUseWorkflows.mockReturnValue(nonEmptyWorkflowsResult as any);
    });

    it('passes the managed URL filter to workflow filter options', () => {
      renderPage(['/?managed=all']);

      expect(mockUseWorkflowFiltersOptions).toHaveBeenCalledWith(
        ['enabled', 'createdBy', 'tags'],
        'all'
      );
    });
  });
});
