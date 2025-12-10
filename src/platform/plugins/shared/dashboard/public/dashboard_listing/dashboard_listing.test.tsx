/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { TabbedTableListView } from '@kbn/content-management-tabbed-table-list-view';

import { DashboardListing } from './dashboard_listing';
import type { DashboardListingProps } from './types';
import { render } from '@testing-library/react';

jest.mock('@kbn/content-management-tabbed-table-list-view', () => ({
  TabbedTableListView: jest.fn().mockReturnValue(null),
}));

jest.mock('@kbn/content-management-table-list-view-table', () => {
  const originalModule = jest.requireActual('@kbn/content-management-table-list-view-table');
  return {
    __esModule: true,
    ...originalModule,
    TableListViewKibanaProvider: jest
      .fn()
      .mockImplementation(({ children }: PropsWithChildren<unknown>) => {
        return <>{children}</>;
      }),
  };
});

const TestWrapper = ({ children }: PropsWithChildren<{}>) => (
  <I18nProvider>
    <MemoryRouter>{children}</MemoryRouter>
  </I18nProvider>
);

const renderDashboardListing = (props: Partial<DashboardListingProps> = {}) =>
  render(
    <DashboardListing
      goToDashboard={jest.fn()}
      getDashboardUrl={jest.fn()}
      listingViewRegistry={new Set()}
      {...props}
    />,
    {
      wrapper: TestWrapper,
    }
  );

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders TabbedTableListView with correct title and tabs', async () => {
  renderDashboardListing();

  expect(TabbedTableListView).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Dashboards',
      headingId: 'dashboardListingHeading',
      tabs: expect.arrayContaining([
        expect.objectContaining({ id: 'dashboards', title: 'Dashboards' }),
        expect.objectContaining({ id: 'visualizations', title: 'Visualizations' }),
      ]),
    }),
    expect.any(Object)
  );
});

test('renders with default active tab when no activeTab param', async () => {
  renderDashboardListing();

  expect(TabbedTableListView).toHaveBeenCalledWith(
    expect.objectContaining({
      activeTabId: 'dashboards',
    }),
    expect.any(Object)
  );
});

test('includes registry tabs in the tabs array', async () => {
  const mockRegistryTab = { id: 'custom', title: 'Custom Tab', getTableList: jest.fn() };
  const registry = new Set([mockRegistryTab]);

  renderDashboardListing({ listingViewRegistry: registry });

  expect(TabbedTableListView).toHaveBeenCalledWith(
    expect.objectContaining({
      tabs: expect.arrayContaining([
        expect.objectContaining({ id: 'dashboards' }),
        expect.objectContaining({ id: 'visualizations' }),
        expect.objectContaining({ id: 'custom', title: 'Custom Tab' }),
      ]),
    }),
    expect.any(Object)
  );
});
