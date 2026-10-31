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
import type { DashboardContentListProps } from './dashboard_content_list';
import { coreServices } from '../services/kibana_services';
import { DashboardListingTable } from './dashboard_listing_table';
import { useDashboardListingTable } from './hooks/use_dashboard_listing_table';

const mockContentListClientProvider = jest.fn(({ children }: ContentListClientProviderProps) => (
  <>{children}</>
));
const mockDashboardContentList = jest.fn((_props: DashboardContentListProps) => null);

jest.mock('@kbn/content-list-provider-client', () => ({
  ContentListClientProvider: (props: ContentListClientProviderProps) =>
    mockContentListClientProvider(props),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useExecutionContext: jest.fn(),
}));

jest.mock('./dashboard_content_list', () => ({
  DashboardContentList: (props: DashboardContentListProps) => mockDashboardContentList(props),
}));

jest.mock('./hooks/use_dashboard_listing_table', () => ({
  useDashboardListingTable: jest.fn(),
}));

const mockUseDashboardListingTable = jest.mocked(useDashboardListingTable);

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders the embedded Dashboard Content List with the shared provider configuration', () => {
  const emptyState = <div>Empty</div>;
  const refreshUnsavedDashboards = jest.fn();
  const contentListProviderProps = {
    id: 'dashboard',
    core: coreServices,
    labels: {
      entity: 'Dashboard',
      entityPlural: 'Dashboards',
    },
    findItems: jest.fn().mockResolvedValue({
      total: 0,
      hits: [],
    }),
  };

  mockUseDashboardListingTable.mockReturnValue({
    contentListProviderProps,
    emptyState,
    refreshUnsavedDashboards,
    unsavedDashboardIds: ['dashboard-1'],
  });

  const getDashboardUrl = jest.fn();
  const goToDashboard = jest.fn();

  render(
    <DashboardListingTable
      disableCreateDashboardButton
      getDashboardUrl={getDashboardUrl}
      goToDashboard={goToDashboard}
      initialFilter="security"
      urlStateEnabled={false}
      useSessionStorageIntegration={false}
    />
  );

  expect(mockUseDashboardListingTable).toHaveBeenCalledWith({
    disableCreateDashboardButton: true,
    getDashboardUrl,
    goToDashboard,
    initialFilter: 'security',
    urlStateEnabled: false,
    useSessionStorageIntegration: false,
  });

  const providerProps = mockContentListClientProvider.mock.calls[0][0];
  expect(providerProps.id).toBe('dashboard');

  expect(mockDashboardContentList).toHaveBeenCalledWith({
    emptyState,
    goToDashboard,
    refreshUnsavedDashboards,
    unsavedDashboardIds: ['dashboard-1'],
  });
});
