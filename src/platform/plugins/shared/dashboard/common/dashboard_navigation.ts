/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

import {
  DASHBOARD_ALL_NAV_ITEM_ID,
  DASHBOARD_APP_ID,
  DASHBOARD_CREATE_NAV_LINK,
  LANDING_PAGE_PATH,
} from './page_bundle_constants';

export interface DashboardNavigationPanelItem {
  id: string;
  title: string;
  href: string;
}

export interface DashboardsNavigationNodeOptions {
  getIsActive?: NodeDefinition['getIsActive'];
  title?: string;
  recentDashboards?: DashboardNavigationPanelItem[];
  starredDashboards?: DashboardNavigationPanelItem[];
}

const isDashboardsListingPath = (pathNameSerialized: string, prepend: (path: string) => string) => {
  const dashboardsAppPath = prepend(`/app/${DASHBOARD_APP_ID}`);

  if (!pathNameSerialized.startsWith(dashboardsAppPath)) {
    return false;
  }

  const hash = pathNameSerialized.slice(dashboardsAppPath.length);

  return (
    hash === '' ||
    hash === '#' ||
    hash.startsWith(`#${LANDING_PAGE_PATH}`) ||
    hash.startsWith(`#${LANDING_PAGE_PATH}?`)
  );
};

const createDashboardHrefGetIsActive = (href: string): NodeDefinition['getIsActive'] => {
  const url = new URL(href);
  const pathWithHash = `${url.pathname}${url.hash.split('?')[0]}`;

  return ({ pathNameSerialized }) => pathNameSerialized.startsWith(pathWithHash);
};

const createDashboardPanelItem = (item: DashboardNavigationPanelItem): NodeDefinition => ({
  id: item.id,
  title: item.title,
  href: item.href,
  getIsActive: createDashboardHrefGetIsActive(item.href),
});

export const createDashboardsNavigationNode = (
  options: DashboardsNavigationNodeOptions = {}
): NodeDefinition => {
  const children: NodeDefinition[] = [
    {
      id: 'dashboards_overview',
      children: [
        {
          id: DASHBOARD_ALL_NAV_ITEM_ID,
          link: DASHBOARD_APP_ID,
          title: i18n.translate('dashboard.nav.allDashboards', {
            defaultMessage: 'All dashboards',
          }),
          getIsActive: ({ pathNameSerialized, prepend }) =>
            isDashboardsListingPath(pathNameSerialized, prepend),
        },
      ],
    },
  ];

  if (options.starredDashboards?.length) {
    children.push({
      id: 'dashboards_starred',
      title: i18n.translate('dashboard.nav.starred', {
        defaultMessage: 'Starred',
      }),
      children: options.starredDashboards.map(createDashboardPanelItem),
    });
  }

  if (options.recentDashboards?.length) {
    children.push({
      id: 'dashboards_recent',
      title: i18n.translate('dashboard.nav.recent', {
        defaultMessage: 'Recent',
      }),
      children: options.recentDashboards.map(createDashboardPanelItem),
    });
  }

  return {
    id: DASHBOARD_APP_ID,
    title:
      options.title ??
      i18n.translate('dashboard.nav.dashboards', {
        defaultMessage: 'Dashboards',
      }),
    renderAs: 'panelOpener',
    icon: 'productDashboard',
    panelHeaderActions: [
      {
        id: 'dashboards_search',
        iconType: 'search',
        opensNestedPanel: 'dashboards_search',
        ariaLabel: i18n.translate('dashboard.nav.findDashboard', {
          defaultMessage: 'Find dashboard',
        }),
      },
    ],
    panelNestedPanels: [
      {
        id: 'dashboards_search',
        title: i18n.translate('dashboard.nav.findDashboard', {
          defaultMessage: 'Find dashboard',
        }),
      },
    ],
    panelFooterActions: [
      {
        id: 'dashboards_create',
        label: i18n.translate('dashboard.nav.createDashboard', {
          defaultMessage: 'Create dashboard',
        }),
        iconType: 'plus',
        link: DASHBOARD_CREATE_NAV_LINK as AppDeepLinkId,
      },
    ],
    children,
    getIsActive:
      options.getIsActive ??
      (({ pathNameSerialized, prepend }) =>
        pathNameSerialized.startsWith(prepend(`/app/${DASHBOARD_APP_ID}`))),
  };
};
