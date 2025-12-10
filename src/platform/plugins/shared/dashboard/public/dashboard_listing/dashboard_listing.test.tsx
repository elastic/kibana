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
import { TabbedTableListView } from '@kbn/content-management-tabbed-table-list-view';

import { DashboardListing } from './dashboard_listing';
import type { DashboardListingProps } from './types';
import { render } from '@testing-library/react';
import { coreServices } from '../services/kibana_services';

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

test('renders TabbedTableListView with correct title and tabs', () => {
  renderDashboardListing();

  const props = getLastCalledProps();
  expect(props).toMatchObject({
    title: 'Dashboards',
    headingId: 'dashboardListingHeading',
  });
  expect(props.tabs[0]).toMatchObject({ id: 'dashboards', title: 'Dashboards' });
  expect(props.tabs[1]).toMatchObject({ id: 'visualizations', title: 'Visualizations' });
});

test('defaults to dashboards tab when no activeTab in URL', () => {
  renderDashboardListing();

  expect(getLastCalledProps().activeTabId).toBe('dashboards');
});

test('reads activeTab from URL path param', () => {
  renderDashboardListing({}, { initialEntries: ['/list/visualizations'] });

  expect(getLastCalledProps().activeTabId).toBe('visualizations');
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
  renderDashboardListing();

  const { changeActiveTab } = getLastCalledProps();
  changeActiveTab('visualizations');

  expect(coreServices.application.navigateToUrl).toHaveBeenCalledWith('#/list/visualizations');
});

test('falls back to dashboards tab when URL has invalid activeTab', () => {
  renderDashboardListing({}, { initialEntries: ['/list/invalid-tab'] });

  expect(getLastCalledProps().activeTabId).toBe('dashboards');
});
