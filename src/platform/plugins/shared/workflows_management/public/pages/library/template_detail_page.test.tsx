/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { of } from 'rxjs';
import type { TemplateBody } from '@kbn/workflows-library';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { LibraryTemplateDetailPage } from './template_detail_page';
import { mockWorkflowsManagementCapabilities } from '../../hooks/__mocks__/use_workflows_capabilities';
import { createStartServicesMock, type StartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

const mockSetWorkflowsBreadcrumbs = jest.fn();
const mockUseWorkflowsExperimentalUiSetting = jest.fn(() => false);
let mockOnLoaded: ((template: TemplateBody) => void) | undefined;
let mockShowGraphPreview: boolean | undefined;

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
  TemplateDetail: ({
    slug,
    onLoaded,
    showGraphPreview,
    primaryAction,
  }: {
    slug: string;
    onLoaded: (template: TemplateBody) => void;
    showGraphPreview: boolean;
    primaryAction?: React.ReactNode;
  }) => {
    mockOnLoaded = onLoaded;
    mockShowGraphPreview = showGraphPreview;
    return (
      <div data-test-subj="mockTemplateDetail">
        {slug}
        {primaryAction}
      </div>
    );
  },
}));

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;

jest.mock('../../hooks/use_workflows_experimental_ui_setting', () => ({
  useWorkflowsExperimentalUiSetting: () => mockUseWorkflowsExperimentalUiSetting(),
}));

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useSetWorkflowsBreadcrumbs: () => mockSetWorkflowsBreadcrumbs,
}));

function buildEnabledServices(): StartServicesMock {
  const services = createStartServicesMock();
  services.settings.globalClient.get.mockReturnValue(true);
  services.settings.globalClient.get$.mockReturnValue(of(true));
  return services;
}

const routeProps = (slug: string) =>
  ({
    match: { params: { slug } },
  } as RouteComponentProps<{ slug: string }>);

describe('LibraryTemplateDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsExperimentalUiSetting.mockReturnValue(false);
    mockUseWorkflowsCapabilities.mockReturnValue(mockWorkflowsManagementCapabilities);
    mockOnLoaded = undefined;
    mockShowGraphPreview = undefined;
  });

  it('resets breadcrumbs to Library when the route slug changes', async () => {
    const services = buildEnabledServices();
    const { rerender } = render(<LibraryTemplateDetailPage {...routeProps('first-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    act(() => {
      mockOnLoaded?.({
        metadata: { slug: 'first-template', name: 'First template' },
      } as TemplateBody);
    });

    await waitFor(() => {
      expect(mockSetWorkflowsBreadcrumbs).toHaveBeenLastCalledWith(
        expect.arrayContaining([expect.objectContaining({ text: 'First template' })])
      );
    });

    rerender(<LibraryTemplateDetailPage {...routeProps('second-template')} />);

    await waitFor(() => {
      expect(mockSetWorkflowsBreadcrumbs).toHaveBeenLastCalledWith([
        expect.objectContaining({ text: 'Template Library' }),
      ]);
    });
  });

  it('renders the "Add workflow" button when the user can create workflows', () => {
    const services = buildEnabledServices();

    render(<LibraryTemplateDetailPage {...routeProps('first-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    act(() => {
      mockOnLoaded?.({
        metadata: { slug: 'first-template', name: 'First template' },
      } as TemplateBody);
    });

    expect(
      screen.queryByTestId('workflowLibraryTemplateDetailAddWorkflowButton')
    ).toBeInTheDocument();
  });

  it('hides the "Add workflow" button for users without create capability', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...mockWorkflowsManagementCapabilities,
      canCreateWorkflow: false,
    });
    const services = buildEnabledServices();

    render(<LibraryTemplateDetailPage {...routeProps('first-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    act(() => {
      mockOnLoaded?.({
        metadata: { slug: 'first-template', name: 'First template' },
      } as TemplateBody);
    });

    expect(
      screen.queryByTestId('workflowLibraryTemplateDetailAddWorkflowButton')
    ).not.toBeInTheDocument();
  });

  it('passes the visual editor flag through to the template detail preview', () => {
    mockUseWorkflowsExperimentalUiSetting.mockReturnValue(true);
    const services = buildEnabledServices();

    render(<LibraryTemplateDetailPage {...routeProps('first-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    expect(mockShowGraphPreview).toBe(true);
  });
});
