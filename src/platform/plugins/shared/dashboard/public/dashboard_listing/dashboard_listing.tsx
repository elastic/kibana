/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { TabbedTableListView } from '@kbn/content-management-tabbed-table-list-view';
import { I18nProvider } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';

import { AppHeader } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { coreServices } from '../services/kibana_services';
import { dashboardQueryClient } from '../services/dashboard_query_client';
import { DASHBOARD_APP_ID, LANDING_PAGE_PATH } from '../../common/page_bundle_constants';
import { getDashboardListingTabs } from './get_dashboard_listing_tabs';
import type { DashboardListingProps, DashboardListingTab } from './types';

export const DashboardListing = ({
  children,
  initialFilter,
  goToDashboard,
  getDashboardUrl,
  useSessionStorageIntegration,
  getTabs,
}: DashboardListingProps) => {
  useExecutionContext(coreServices.executionContext, {
    type: 'application',
    page: 'list',
  });

  const history = useHistory();
  const { activeTab: activeTabParam } = useParams<{ activeTab?: string }>();

  const tabs = useMemo(
    () =>
      getDashboardListingTabs({
        goToDashboard,
        getDashboardUrl,
        useSessionStorageIntegration,
        initialFilter,
        getTabs,
      }),
    [goToDashboard, getDashboardUrl, useSessionStorageIntegration, initialFilter, getTabs]
  );

  const activeTabId = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTabParam)?.id ?? 'dashboards';
  }, [tabs, activeTabParam]);

  const changeActiveTab = (tabId: string) => {
    history.push(`/list/${tabId}`);
  };

  const getBreadcrumbs = useCallback(
    (appId: string): EmbeddableEditorBreadcrumb[] => {
      const activeTabTitle = tabs.find((tab) => tab.id === activeTabId)?.title;
      const dashboardBreadcrumb = {
        text: i18n.translate('dashboard.listing.title', {
          defaultMessage: 'Dashboards',
        }),
        href: coreServices.application.getUrlForApp(appId, {
          path: `#${LANDING_PAGE_PATH}`,
        }),
      };

      if (!activeTabTitle || activeTabId === DASHBOARD_APP_ID) {
        return [dashboardBreadcrumb];
      }

      return [
        dashboardBreadcrumb,
        {
          text: activeTabTitle,
          href: coreServices.application.getUrlForApp(appId, { path: window.location.hash }),
        },
      ];
    },
    [tabs, activeTabId]
  );

  const appMenu: AppMenuConfig = useMemo(() => {
    const tabsByIdMap = new Map((tabs as DashboardListingTab[]).map((tab) => [tab.id, tab]));
    return {
      primaryActionItem: {
        id: 'create',
        testId: 'dashboardListingCreateButton',
        iconType: 'plus',
        label: i18n.translate('dashboard.listing.createButtonLabel', {
          defaultMessage: 'Create',
        }),
        popoverWidth: 180,
        items: [
          {
            id: 'createDashboard',
            order: 1,
            label: 'Dashboard',
            iconType: 'productDashboard',
            testId: 'createDashboardButton',
            run: () => tabsByIdMap.get('dashboards')?.createAction?.(),
          },
          {
            id: 'createVisualization',
            order: 2,
            label: 'Visualization',
            iconType: 'chartBarVertical',
            testId: 'createVisualizationButton',
            run: () => tabsByIdMap.get('visualizations')?.createAction?.(),
          },
          {
            id: 'createAnnotation',
            order: 3,
            label: 'Annotation',
            iconType: 'flag',
            testId: 'createAnnotationButton',
            run: () => tabsByIdMap.get('annotations')?.createAction?.(),
          },
        ],
      },
    };
  }, [tabs]);

  return (
    <I18nProvider>
      <QueryClientProvider client={dashboardQueryClient}>
        {children}
        <AppHeader
          title={i18n.translate('dashboard.listing.title', {
            defaultMessage: 'Dashboards',
          })}
          menu={appMenu}
        />
        <TabbedTableListView
          headingId="dashboardListingHeading"
          getBreadcrumbs={getBreadcrumbs}
          tabs={tabs}
          activeTabId={activeTabId}
          changeActiveTab={changeActiveTab}
          showCreateButton={false}
        />
      </QueryClientProvider>
    </I18nProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardListing;
