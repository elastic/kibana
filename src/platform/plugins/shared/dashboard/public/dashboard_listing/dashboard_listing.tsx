/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { TabbedTableListView } from '@kbn/content-management-tabbed-table-list-view';
import { I18nProvider } from '@kbn/i18n-react';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';

import { AppHeader } from '@kbn/app-header';
import type { AppHeaderTab } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { coreServices } from '../services/kibana_services';
import { dashboardQueryClient } from '../services/dashboard_query_client';
import { DASHBOARD_APP_ID, LANDING_PAGE_PATH } from '../../common/page_bundle_constants';
import { getDashboardListingTabs } from './get_dashboard_listing_tabs';
import type { DashboardListingProps } from './types';
import { openImportDashboardJsonFlyout } from './import_json/open_import_dashboard_json_flyout';
import { importDashboardJsonStrings } from './import_json/_import_dashboard_json_strings';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';
import { confirmCreateWithUnsaved } from './confirm_overlays';
import { getDashboardBackupService } from '../services/dashboard_api_services';

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

  const [refreshListBouncer, setRefreshListBouncer] = useState(false);

  const tabs = useMemo(
    () =>
      getDashboardListingTabs({
        goToDashboard,
        getDashboardUrl,
        useSessionStorageIntegration,
        initialFilter,
        getTabs,
        refreshListBouncer,
      }),
    [
      goToDashboard,
      getDashboardUrl,
      useSessionStorageIntegration,
      initialFilter,
      getTabs,
      refreshListBouncer,
    ]
  );

  const activeTabId = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTabParam)?.id ?? 'dashboards';
  }, [tabs, activeTabParam]);

  const changeActiveTab = useCallback(
    (tabId: string) => {
      history.push(`/list/${tabId}`);
    },
    [history]
  );

  const headerTabs = useMemo<AppHeaderTab[]>(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        label: tab.title,
        isSelected: tab.id === activeTabId,
        onClick: () => changeActiveTab(tab.id),
      })),
    [tabs, activeTabId, changeActiveTab]
  );

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
          href: coreServices.application.getUrlForApp(appId, {
            path: `#${LANDING_PAGE_PATH}/${activeTabId}`,
          }),
        },
      ];
    },
    [tabs, activeTabId]
  );

  const onImportSuccess = useCallback((id: string, title: string) => {
    setRefreshListBouncer((b) => !b);
    coreServices.notifications.toasts.addSuccess(importDashboardJsonStrings.getSuccessToast(title));
  }, []);

  const createDashboardAction = useCallback(() => {
    if (useSessionStorageIntegration && getDashboardBackupService().dashboardHasUnsavedEdits()) {
      confirmCreateWithUnsaved(() => {
        getDashboardBackupService().clearState();
        goToDashboard();
      }, goToDashboard);
      return;
    }
    goToDashboard();
  }, [goToDashboard, useSessionStorageIntegration]);

  const appMenu = useMemo<AppMenuConfig | undefined>(() => {
    const secondaryCreateActions = getTabs
      ? getTabs()
          .filter((tab) => Boolean(tab.createAction))
          .map((tab) => ({
            id: `create_${tab.id}`,
            order: tab.createAction!.order,
            label: tab.createAction!.label,
            iconType: tab.createAction!.iconType,
            testId: `create_${tab.id}_button`,
            run: () => tab.createAction!.create(`#${LANDING_PAGE_PATH}/${tab.id}`),
          }))
      : [];

    return {
      primaryActionItem: {
        id: 'createDashboard',
        testId: 'dashboardListingCreateButton',
        iconType: 'plus',
        label: i18n.translate('dashboard.listing.createButtonLabel', {
          defaultMessage: 'Create dashboard',
        }),
        run: () => createDashboardAction(),
        popoverWidth: 200,
        splitButtonProps:
          secondaryCreateActions.length > 0
            ? {
                secondaryButtonAriaLabel: i18n.translate(
                  'dashboard.listing.createMoreActionsButtonAriaLabel',
                  {
                    defaultMessage: 'Create more dashboard content',
                  }
                ),
                items: secondaryCreateActions,
              }
            : undefined,
      },
      items: getDashboardCapabilities().createNew
        ? [
            {
              id: 'importDashboardJson',
              order: 0,
              label: i18n.translate('dashboard.listing.importDashboardButtonLabel', {
                defaultMessage: 'Import dashboard',
              }),
              iconType: 'upload',
              testId: 'dashboardListingImportButton',
              run: (params) => {
                openImportDashboardJsonFlyout({
                  onImportSuccess,
                  returnFocus: params?.returnFocus,
                });
              },
            },
          ]
        : [],
    };
  }, [onImportSuccess, createDashboardAction, getTabs]);

  return (
    <I18nProvider>
      <QueryClientProvider client={dashboardQueryClient}>
        {children}
        <AppHeader
          title={i18n.translate('dashboard.listing.title', {
            defaultMessage: 'Dashboards',
          })}
          tabs={headerTabs}
          menu={appMenu}
        />
        <TabbedTableListView
          headingId="dashboardListingHeading"
          getBreadcrumbs={getBreadcrumbs}
          tabs={tabs}
          activeTabId={activeTabId}
          changeActiveTab={changeActiveTab}
          showCreateButton={false}
          hideTabs
        />
      </QueryClientProvider>
    </I18nProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default DashboardListing;
