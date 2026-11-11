/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { of } from 'rxjs';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { WorkflowsPageName } from '@kbn/deeplinks-workflows';
import { setWorkflowsNavLinks } from './test_helpers';
import { WorkflowsAppLayout } from './workflows_app_layout';
import { createStartServicesMock } from '../../mocks';
import { TestProvider } from '../../shared/mocks/test_providers';

const ALL_PAGES = [WorkflowsPageName.list, WorkflowsPageName.library, WorkflowsPageName.executions];

const LocationDisplay = () => <div data-test-subj="location">{useLocation().pathname}</div>;

const renderLayout = ({
  chromeStyle = 'classic',
  pages = ALL_PAGES,
}: { chromeStyle?: ChromeStyle; pages?: WorkflowsPageName[] } = {}) => {
  const services = createStartServicesMock();
  setWorkflowsNavLinks(services, pages);
  services.chrome.getChromeStyle$.mockReturnValue(of(chromeStyle));
  services.chrome.getChromeStyle.mockReturnValue(chromeStyle);

  return render(
    <TestProvider services={services}>
      <WorkflowsAppLayout>
        <div data-test-subj="pageContent" />
        <LocationDisplay />
      </WorkflowsAppLayout>
    </TestProvider>
  );
};

describe('WorkflowsAppLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the sidebar in classic navigation', () => {
    renderLayout();

    expect(screen.getByTestId('workflowsAppSidebar')).toBeInTheDocument();
    expect(screen.getByTestId('workflowsSideNav-list')).toBeInTheDocument();
    expect(screen.getByTestId('workflowsSideNav-library')).toBeInTheDocument();
    expect(screen.getByTestId('workflowsSideNav-executions')).toBeInTheDocument();
  });

  it('should not render the sidebar in solution navigation', () => {
    renderLayout({ chromeStyle: 'project' });

    expect(screen.queryByTestId('workflowsAppSidebar')).not.toBeInTheDocument();
  });

  it('should render the sidebar when only the library deep link is registered alongside the list', () => {
    renderLayout({ pages: [WorkflowsPageName.list, WorkflowsPageName.library] });

    expect(screen.getByTestId('workflowsAppSidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowsSideNav-executions')).not.toBeInTheDocument();
  });

  it('should not render the sidebar when the list is the only registered deep link', () => {
    renderLayout({ pages: [WorkflowsPageName.list] });

    expect(screen.queryByTestId('workflowsAppSidebar')).not.toBeInTheDocument();
  });

  it('should navigate through the router when a sidebar link is clicked', async () => {
    renderLayout();

    await userEvent.click(screen.getByTestId('workflowsSideNav-library'));

    expect(screen.getByTestId('location')).toHaveTextContent('/library');
  });

  it.each([
    ['classic' as const, ALL_PAGES],
    ['classic' as const, [WorkflowsPageName.list]],
    ['project' as const, ALL_PAGES],
  ])('should always render its children (chromeStyle %s)', (chromeStyle, pages) => {
    renderLayout({ chromeStyle, pages });

    expect(screen.getByTestId('pageContent')).toBeInTheDocument();
  });
});
