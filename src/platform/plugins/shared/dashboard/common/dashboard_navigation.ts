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
  DASHBOARD_ALL_NAV_LINK,
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

const DASHBOARDS_ITEM_ACTION_MENU_ID = 'dashboards_item_actions';

const getDashboardIdFromNavItemId = (navItemId: string): string =>
  navItemId.replace(/^(recent|starred)_/, '');

const createDashboardPanelItem = (
  item: DashboardNavigationPanelItem,
  section: 'recent' | 'starred'
): NodeDefinition => {
  const dashboardId = getDashboardIdFromNavItemId(item.id);

  return {
    id: item.id,
    title: item.title,
    href: item.href,
    getIsActive: createDashboardHrefGetIsActive(item.href),
    itemActions: [
      {
        id: `dashboards_item_actions_${item.id}`,
        iconType: 'ellipsis',
        ariaLabel: i18n.translate('dashboard.nav.dashboardItemActions', {
          defaultMessage: 'Dashboard actions',
        }),
        opensItemActionMenu: DASHBOARDS_ITEM_ACTION_MENU_ID,
        itemActionMenuContext: {
          dashboardId,
          section,
          title: item.title,
        },
      },
    ],
  };
};

export const createDashboardsNavigationNode = (
  options: DashboardsNavigationNodeOptions = {}
): NodeDefinition => {
  const children: NodeDefinition[] = [
    {
      id: 'dashboards_overview',
      children: [
        {
          id: DASHBOARD_ALL_NAV_ITEM_ID,
          link: DASHBOARD_ALL_NAV_LINK,
          title: i18n.translate('dashboard.nav.allDashboards', {
            defaultMessage: 'All dashboards',
          }),
          itemActions: [
            {
              id: 'dashboards_search',
              iconType: 'search',
              opensNestedPanel: 'dashboards_search',
              ariaLabel: i18n.translate('dashboard.nav.findDashboard', {
                defaultMessage: 'Find dashboard',
              }),
            },
          ],
          getIsActive: ({ pathNameSerialized, prepend }) =>
            isDashboardsListingPath(pathNameSerialized, prepend),
        },
      ],
    },
  ];

  children.push({
    id: 'dashboards_starred',
    title: i18n.translate('dashboard.nav.starred', {
      defaultMessage: 'Starred',
    }),
    emptyState: {
      iconType: 'starEmpty',
      message: i18n.translate('dashboard.nav.starredEmpty', {
        defaultMessage: 'Dashboards you starred',
      }),
    },
    children: options.starredDashboards?.map((item) => createDashboardPanelItem(item, 'starred')) ?? [],
  });

  children.push({
    id: 'dashboards_recent',
    title: i18n.translate('dashboard.nav.recent', {
      defaultMessage: 'Recent',
    }),
    animateItemReorder: true,
    emptyState: {
      iconType: 'clockCounter',
      message: i18n.translate('dashboard.nav.recentEmpty', {
        defaultMessage: 'Dashboards you recently visited',
      }),
    },
    children: options.recentDashboards?.map((item) => createDashboardPanelItem(item, 'recent')) ?? [],
  });

  return {
    id: DASHBOARD_APP_ID,
    title:
      options.title ??
      i18n.translate('dashboard.nav.dashboards', {
        defaultMessage: 'Dashboards',
      }),
    renderAs: 'panelOpener',
    icon: 'productDashboard',
    link: DASHBOARD_ALL_NAV_LINK,
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
