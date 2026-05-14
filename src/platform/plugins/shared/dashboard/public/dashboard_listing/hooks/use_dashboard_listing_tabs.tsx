/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import type { EuiPageHeaderProps } from '@elastic/eui';
import type { TableListTab } from '@kbn/content-management-tabbed-table-list-view';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

/** Stable id for the built-in dashboards tab. */
export const DASHBOARDS_TAB_ID = 'dashboards';

export interface UseDashboardListingTabsArgs {
  /**
   * Optional registry of additional tabs to append after the built-in
   * dashboards tab (e.g. visualizations, annotation groups).
   */
  getTabs?: () => TableListTab[];
  /** Localized label for the built-in dashboards tab. */
  dashboardsLabel: string;
}

export interface UseDashboardListingTabsResult {
  /** The currently active tab id, falling back to the dashboards tab. */
  activeTabId: string;
  /** Tabs registered via `getTabs`, in their registration order. */
  externalTabs: Array<TableListTab<UserContentCommonSchema>>;
  /** Tab descriptors for `KibanaContentListPage.Header.tabs`. */
  headerTabs: NonNullable<EuiPageHeaderProps['tabs']>;
  /** `true` when the dashboards tab is selected. */
  isDashboardsTab: boolean;
}

/**
 * Tab routing for the dashboard listing page.
 *
 * Reads `:activeTab` from the route, validates it against the built-in
 * dashboards tab plus any tabs registered via `getTabs`, and exposes
 * descriptors ready to feed into `KibanaContentListPage.Header`.
 */
export const useDashboardListingTabs = ({
  getTabs,
  dashboardsLabel,
}: UseDashboardListingTabsArgs): UseDashboardListingTabsResult => {
  const history = useHistory();
  const { activeTab: activeTabParam } = useParams<{ activeTab?: string }>();

  const externalTabs = useMemo<Array<TableListTab<UserContentCommonSchema>>>(
    () => (getTabs ? getTabs() : []),
    [getTabs]
  );

  const allTabIds = useMemo(
    () => [DASHBOARDS_TAB_ID, ...externalTabs.map((tab) => tab.id)],
    [externalTabs]
  );

  const activeTabId = allTabIds.includes(activeTabParam ?? '')
    ? (activeTabParam as string)
    : DASHBOARDS_TAB_ID;

  const changeActiveTab = useCallback((tabId: string) => history.push(`/list/${tabId}`), [history]);

  const headerTabs = useMemo<NonNullable<EuiPageHeaderProps['tabs']>>(
    () => [
      {
        label: dashboardsLabel,
        isSelected: activeTabId === DASHBOARDS_TAB_ID,
        onClick: () => changeActiveTab(DASHBOARDS_TAB_ID),
      },
      ...externalTabs.map((tab) => ({
        label: tab.title,
        isSelected: activeTabId === tab.id,
        onClick: () => changeActiveTab(tab.id),
      })),
    ],
    [activeTabId, changeActiveTab, dashboardsLabel, externalTabs]
  );

  return {
    activeTabId,
    externalTabs,
    headerTabs,
    isDashboardsTab: activeTabId === DASHBOARDS_TAB_ID,
  };
};
