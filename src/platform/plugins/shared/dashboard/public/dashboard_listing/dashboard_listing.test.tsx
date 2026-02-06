/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { render, waitFor, act } from '@testing-library/react';
/**
 * Mock Tabbed Table List view. This dashboard component is a wrapper around the shared UX tabbed table List view. We
 * need to ensure we're passing down the correct props, but the tabbed table list view itself doesn't need to be rendered
 * in our tests because it is covered in its package.
 */
import { TabbedTableListView } from '@kbn/content-management-tabbed-table-list-view';

import { DashboardListing } from './dashboard_listing';
import type { DashboardListingProps, DashboardListingTab } from './types';

jest.mock('@kbn/content-management-tabbed-table-list-view', () => ({
  __esModule: true,
  TabbedTableListView: jest.fn().mockReturnValue(null),
}));

const renderDashboardListing = (
  props: Partial<DashboardListingProps> = {},
  { initialEntries = ['/list'] }: { initialEntries?: string[] } = {}
) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Route path={['/list/:activeTab', '/list']}>
          <DashboardListing
            goToDashboard={jest.fn()}
            getDashboardUrl={jest.fn()}
            getTabs={() => []}
            {...props}
          />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );

const mockTabbedTableListView = TabbedTableListView as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders TabbedTableListView with correct title and dashboards tab', () => {
  renderDashboardListing();

  expect(mockTabbedTableListView).toHaveBeenCalledTimes(1);
  const props = mockTabbedTableListView.mock.calls[0][0];
  expect(props).toMatchObject({
    title: 'Dashboards',
    headingId: 'dashboardListingHeading',
  });
  expect(props.tabs[0]).toMatchObject({ id: 'dashboards', title: 'Dashboards' });
  expect(props.tabs.length).toBe(1);
});

test('works without getTabs (for embedded use cases)', () => {
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/list']}>
        <Route path={['/list/:activeTab', '/list']}>
          <DashboardListing goToDashboard={jest.fn()} getDashboardUrl={jest.fn()} />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );

  expect(mockTabbedTableListView).toHaveBeenCalledTimes(1);
  const props = mockTabbedTableListView.mock.calls[0][0];
  expect(props.tabs).toHaveLength(1);
  expect(props.tabs[0].id).toBe('dashboards');
});

test('reads activeTab from URL path param when tab exists', () => {
  renderDashboardListing(
    { getTabs: () => [{ id: 'custom-tab', title: 'Custom Tab', getTableList: jest.fn() }] },
    { initialEntries: ['/list/custom-tab'] }
  );

  expect(mockTabbedTableListView).toHaveBeenCalledTimes(1);
  const props = mockTabbedTableListView.mock.calls[0][0];
  expect(props.activeTabId).toBe('custom-tab');
});

test('appends additional tabs after built-in tabs and preserves getTableList', () => {
  const mockGetTableList = jest.fn();
  const mockAdditionalTab: DashboardListingTab = {
    id: 'annotations',
    title: 'Annotations',
    getTableList: mockGetTableList,
  };

  renderDashboardListing({ getTabs: () => [mockAdditionalTab] });

  expect(mockTabbedTableListView).toHaveBeenCalledTimes(1);
  const props = mockTabbedTableListView.mock.calls[0][0];
  const lastTab = props.tabs[props.tabs.length - 1];
  expect(lastTab).toMatchObject({ id: 'annotations', title: 'Annotations' });
  expect(lastTab.getTableList).toBe(mockGetTableList);
});

test('changeActiveTab updates route to show new tab', async () => {
  const mockTab: DashboardListingTab = {
    id: 'custom-tab',
    title: 'Custom Tab',
    getTableList: jest.fn(),
  };

  renderDashboardListing({ getTabs: () => [mockTab] });

  expect(mockTabbedTableListView).toHaveBeenCalledTimes(1);
  const { changeActiveTab } = mockTabbedTableListView.mock.calls[0][0];

  await act(async () => {
    changeActiveTab('custom-tab');
  });

  // Verify the route change caused a re-render with the new activeTabId
  await waitFor(() => {
    const callCount = mockTabbedTableListView.mock.calls.length;
    const props = mockTabbedTableListView.mock.calls[callCount - 1][0];
    expect(props.activeTabId).toBe('custom-tab');
  });
});

test('falls back to dashboards tab when URL has invalid activeTab', () => {
  renderDashboardListing({}, { initialEntries: ['/list/invalid-tab'] });

  expect(mockTabbedTableListView).toHaveBeenCalledTimes(1);
  const props = mockTabbedTableListView.mock.calls[0][0];
  expect(props.activeTabId).toBe('dashboards');
});
