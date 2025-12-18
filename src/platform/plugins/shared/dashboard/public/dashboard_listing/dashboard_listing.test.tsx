/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
/**
 * Mock Tabbed Table List view. This dashboard component is a wrapper around the shared UX tabbed table List view. We
 * need to ensure we're passing down the correct props, but the tabbed table list view itself doesn't need to be rendered
 * in our tests because it is covered in its package.
 */
import { TabbedTableListView } from '@kbn/content-management-tabbed-table-list-view';

import { DashboardListing } from './dashboard_listing';
import type { DashboardListingProps } from './types';
import { coreServices } from '../services/kibana_services';
import { render } from '@testing-library/react';

jest.mock('@kbn/content-management-tabbed-table-list-view', () => ({
  __esModule: true,
  TabbedTableListView: jest.fn().mockReturnValue(null),
}));

jest.mock('../services/kibana_services', () => ({
  coreServices: {
    executionContext: {
      set: jest.fn(),
      clear: jest.fn(),
    },
    application: {
      navigateToUrl: jest.fn(),
    },
  },
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
            listingViewRegistry={new Set()}
            {...props}
          />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );

const mockTabbedTableListView = TabbedTableListView as jest.Mock;

const getLastCalledProps = () => {
  expect(mockTabbedTableListView).toHaveBeenCalled();
  const lastCallIndex = mockTabbedTableListView.mock.calls.length - 1;
  return mockTabbedTableListView.mock.calls[lastCallIndex][0];
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders TabbedTableListView with correct title and dashboards tab', () => {
  renderDashboardListing();

  const props = getLastCalledProps();
  expect(props).toMatchObject({
    title: 'Dashboards',
    headingId: 'dashboardListingHeading',
  });
  expect(props.tabs[0]).toMatchObject({ id: 'dashboards', title: 'Dashboards' });
  expect(props.tabs.length).toBe(1);
});

test('reads activeTab from URL path param when tab exists in registry', () => {
  const mockTab = {
    id: 'custom-tab',
    title: 'Custom Tab',
    getTableList: jest.fn(),
  };
  const registry = new Set([mockTab]);

  renderDashboardListing(
    { listingViewRegistry: registry },
    { initialEntries: ['/list/custom-tab'] }
  );

  expect(getLastCalledProps().activeTabId).toBe('custom-tab');
});

test('appends registry tabs after built-in tabs and preserves getTableList', () => {
  const mockGetTableList = jest.fn();
  const mockRegistryTab = {
    id: 'annotations',
    title: 'Annotations',
    getTableList: mockGetTableList,
  };
  const registry = new Set([mockRegistryTab]);

  renderDashboardListing({ listingViewRegistry: registry });

  const props = getLastCalledProps();
  const lastTab = props.tabs[props.tabs.length - 1];
  expect(lastTab).toMatchObject({ id: 'annotations', title: 'Annotations' });
  expect(lastTab.getTableList).toBe(mockGetTableList);
});

test('changeActiveTab navigates to the correct URL', () => {
  const mockTab = {
    id: 'custom-tab',
    title: 'Custom Tab',
    getTableList: jest.fn(),
  };
  const registry = new Set([mockTab]);

  renderDashboardListing({ listingViewRegistry: registry });

  const { changeActiveTab } = getLastCalledProps();
  changeActiveTab('custom-tab');

  expect(coreServices.application.navigateToUrl).toHaveBeenCalledWith('#/list/custom-tab');
});

test('falls back to dashboards tab when URL has invalid activeTab', () => {
  renderDashboardListing({}, { initialEntries: ['/list/invalid-tab'] });

  expect(getLastCalledProps().activeTabId).toBe('dashboards');
});
