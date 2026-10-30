/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ContentListClientProviderProps } from '@kbn/content-list-provider-client';
import type { TableListTabParentProps } from '@kbn/content-management-tabbed-table-list-view';

import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import { coreServices } from '../services/kibana_services';
import type { DashboardSavedObjectUserContent } from './types';
import type { DashboardContentListProps } from './dashboard_content_list';
import { toContentListPageTabs } from './get_dashboard_listing_tabs';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';

const mockContentListClientProvider = jest.fn(({ children }: ContentListClientProviderProps) => (
  <>{children}</>
));
const mockDashboardContentList = jest.fn((_props: DashboardContentListProps) => null);

jest.mock('@kbn/content-list-provider-client', () => ({
  ContentListClientProvider: (props: ContentListClientProviderProps) =>
    mockContentListClientProvider(props),
}));

jest.mock('./dashboard_content_list', () => ({
  DashboardContentList: (props: DashboardContentListProps) => mockDashboardContentList(props),
}));

const mockRefetch = jest.fn();
jest.mock('@kbn/content-list', () => ({
  useContentListItems: () => ({ refetch: mockRefetch }),
}));

jest.mock('./hooks/use_dashboard_listing_table', () => ({
  useDashboardListingTable: jest.fn(),
}));

const mockUseDashboardListingTable = jest.mocked(useDashboardListingTable);

const emptyState = <div>Empty</div>;
const refreshUnsavedDashboards = jest.fn();
const contentListProviderProps = {
  id: DASHBOARD_APP_ID,
  core: coreServices,
  labels: { entity: 'Dashboard', entityPlural: 'Dashboards' },
  findItems: jest.fn().mockResolvedValue({ total: 0, hits: [] }),
};

beforeEach(() => {
  jest.clearAllMocks();

  mockUseDashboardListingTable.mockReturnValue({
    contentListProviderProps,
    emptyState,
    refreshUnsavedDashboards,
    unsavedDashboardIds: ['dashboard-1'],
  });
});

test('configures the main Dashboard tab with favorites and page callbacks', () => {
  const onFetchSuccess = jest.fn();
  const setPageDataTestSubject = jest.fn();
  const goToDashboard = jest.fn();
  const getDashboardUrl = jest.fn();

  const parentProps: TableListTabParentProps<DashboardSavedObjectUserContent> = {
    onFetchSuccess,
    setPageDataTestSubject,
    showCreateButton: false,
  };

  const [dashboardTab] = toContentListPageTabs(
    [
      {
        id: DASHBOARD_APP_ID,
        title: 'Dashboards',
        getTableList: jest.fn(),
      },
    ],
    {
      goToDashboard,
      getDashboardUrl,
      initialFilter: 'my-filter',
      useSessionStorageIntegration: true,
      refreshListBouncer: false,
      parentProps,
    }
  );

  render(<>{dashboardTab.render?.()}</>);

  expect(mockUseDashboardListingTable).toHaveBeenCalledWith({
    goToDashboard,
    getDashboardUrl,
    initialFilter: 'my-filter',
    useSessionStorageIntegration: true,
  });

  const providerProps = mockContentListClientProvider.mock.calls[0][0];
  expect(providerProps.onFetchSuccess).toBe(onFetchSuccess);
  expect(providerProps.services?.favorites).toBeDefined();

  expect(setPageDataTestSubject).toHaveBeenCalledWith('dashboardLandingPage');

  expect(mockDashboardContentList).toHaveBeenCalledWith({
    emptyState,
    goToDashboard,
    refreshUnsavedDashboards,
    unsavedDashboardIds: ['dashboard-1'],
  });
});

test('refetches the list only after the import signal changes', () => {
  const renderTab = (refreshListBouncer: boolean) => {
    const [tab] = toContentListPageTabs(
      [{ id: DASHBOARD_APP_ID, title: 'Dashboards', getTableList: jest.fn() }],
      {
        goToDashboard: jest.fn(),
        getDashboardUrl: jest.fn(),
        refreshListBouncer,
        parentProps: {
          onFetchSuccess: jest.fn(),
          setPageDataTestSubject: jest.fn(),
          showCreateButton: false,
        },
      }
    );
    return <>{tab.render?.()}</>;
  };

  const { rerender } = render(renderTab(false));

  expect(mockRefetch).not.toHaveBeenCalled();

  rerender(renderTab(true));

  expect(mockRefetch).toHaveBeenCalledTimes(1);
});
