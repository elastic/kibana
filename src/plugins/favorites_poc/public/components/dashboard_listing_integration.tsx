/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import { TableListView } from '@kbn/content-management-table-list-view';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@tanstack/react-query';

// Note: These imports would need to be adjusted based on the actual project structure
// For this POC, we'll use mock implementations
import { FavoritesService } from '../services/favorites_service';

// Mock constants and services for the POC
const DASHBOARD_APP_ID = 'dashboard';
const DASHBOARD_CONTENT_ID = 'dashboard';

// Mock services
const coreServices = {
  http: {} as any,
  userProfile: {} as any,
  executionContext: {} as any,
};

const savedObjectsTaggingService = undefined;
const serverlessService = false;
const usageCollectionService = {} as any;
const dashboardQueryClient = {} as any;

// Mock components
const DashboardUnsavedListing = ({
  goToDashboard,
  unsavedDashboardIds,
  refreshUnsavedDashboards,
}: any) => <div data-testid="dashboard-unsaved-listing">Unsaved Dashboards</div>;

const useDashboardListingTable = (props: any) => ({
  unsavedDashboardIds: [],
  refreshUnsavedDashboards: jest.fn(),
  tableListViewTableProps: {
    title: 'Dashboards',
    findItems: jest.fn(),
    createItem: jest.fn(),
    editItem: jest.fn(),
    deleteItems: jest.fn(),
    getDetailViewLink: jest.fn(),
    getOnClickTitle: jest.fn(),
    entityName: 'dashboard',
    entityNamePlural: 'dashboards',
    tableCaption: 'Dashboards',
    initialFilter: '',
    initialPageSize: 20,
    urlStateEnabled: true,
    createdByEnabled: false,
    recentlyAccessed: undefined,
  },
  contentInsightsClient: undefined,
});

export interface DashboardListingIntegrationProps {
  /** The favorites service instance to use */
  favoritesService: FavoritesService;
  /** Optional children to render */
  children?: React.ReactNode;
  /** Navigation function */
  goToDashboard?: (id: string) => void;
  /** URL generation function */
  getDashboardUrl?: (id: string) => string;
  /** Session storage integration flag */
  useSessionStorageIntegration?: boolean;
  /** Initial filter */
  initialFilter?: any;
}

/**
 * Modified Dashboard Listing that uses our FavoritesService as a drop-in replacement
 * for the existing FavoritesClient.
 *
 * This demonstrates how our service can be used as a drop-in replacement while
 * maintaining all existing functionality.
 */
export const DashboardListingIntegration: React.FC<DashboardListingIntegrationProps> = ({
  children,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  favoritesService,
}) => {
  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const {
    unsavedDashboardIds,
    refreshUnsavedDashboards,
    tableListViewTableProps,
    contentInsightsClient,
  } = useDashboardListingTable({
    goToDashboard,
    getDashboardUrl,
    useSessionStorageIntegration,
    initialFilter,
  });

  // Configure our service for Dashboard app - this makes it compatible with FavoritesClientPublic
  const dashboardFavoritesClient = useMemo(() => {
    return favoritesService.configureForApp(DASHBOARD_APP_ID, DASHBOARD_CONTENT_ID);
  }, [favoritesService]);

  return (
    <I18nProvider>
      <QueryClientProvider client={dashboardQueryClient}>
        <TableListViewKibanaProvider
          {...{
            core: coreServices as any,
            savedObjectsTagging: undefined,
            FormattedRelative,
            favorites: dashboardFavoritesClient, // Our service implements FavoritesClientPublic
            contentInsightsClient,
            isKibanaVersioningEnabled: !serverlessService,
          }}
        >
          <TableListView {...(tableListViewTableProps as any)}>
            <>
              {children}
              <DashboardUnsavedListing
                goToDashboard={goToDashboard}
                unsavedDashboardIds={unsavedDashboardIds}
                refreshUnsavedDashboards={refreshUnsavedDashboards}
              />
            </>
          </TableListView>
        </TableListViewKibanaProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
};

/**
 * Example of how to use the integrated Dashboard listing
 */
export const DashboardListingIntegrationExample: React.FC = () => {
  // Initialize our favorites service
  const favoritesService = useMemo(() => {
    return new FavoritesService({
      http: coreServices.http,
      userProfile: coreServices.userProfile,
      usageCollection: usageCollectionService,
    });
  }, []);

  const goToDashboard = (dashboardId: string) => {
    // Navigate to dashboard
  };

  const getDashboardUrl = (dashboardId: string) => {
    return `/app/dashboards#/view/${dashboardId}`;
  };

  return (
    <DashboardListingIntegration
      favoritesService={favoritesService}
      goToDashboard={goToDashboard}
      getDashboardUrl={getDashboardUrl}
      useSessionStorageIntegration={false}
    />
  );
};
