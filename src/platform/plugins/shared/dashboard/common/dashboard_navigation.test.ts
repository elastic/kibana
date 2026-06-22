/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseNavigationTree } from '@kbn/core-chrome-browser-internal/src/services/project_navigation/utils';
import { toNavigationItems } from '@kbn/core-chrome-browser-components/src/project/sidenav/navigation/to_navigation_items';
import { PanelStateManager } from '@kbn/core-chrome-browser-components/src/project/sidenav/navigation/panel_state_manager';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';

import { createDashboardsNavigationNode } from './dashboard_navigation';
import {
  DASHBOARD_ALL_NAV_ITEM_ID,
  DASHBOARD_ALL_NAV_LINK,
  DASHBOARD_APP_ID,
  DASHBOARD_CREATE_NAV_LINK,
} from './page_bundle_constants';

const getDeepLink = (id: string, path: string, title: string): ChromeNavLink => ({
  id,
  url: `/foo/${path}`,
  href: `http://mocked/kibana/foo/${path}`,
  title,
  baseUrl: '',
  visibleIn: ['globalSearch', 'classicSideNav', 'projectSideNav'],
});

describe('createDashboardsNavigationNode', () => {
  it('creates a panel opener with the all dashboards child link', () => {
    expect(createDashboardsNavigationNode()).toEqual({
      id: DASHBOARD_APP_ID,
      title: 'Dashboards',
      renderAs: 'panelOpener',
      icon: 'productDashboard',
      link: DASHBOARD_ALL_NAV_LINK,
      panelNestedPanels: [
        {
          id: 'dashboards_search',
          title: 'Find dashboard',
        },
      ],
      panelFooterActions: [
        {
          id: 'dashboards_create',
          label: 'Create dashboard',
          iconType: 'plus',
          link: DASHBOARD_CREATE_NAV_LINK,
        },
      ],
      children: [
        {
          id: 'dashboards_overview',
          children: [
            {
              id: DASHBOARD_ALL_NAV_ITEM_ID,
              link: DASHBOARD_ALL_NAV_LINK,
              title: 'All dashboards',
              itemActions: [
                {
                  id: 'dashboards_search',
                  iconType: 'search',
                  opensNestedPanel: 'dashboards_search',
                  ariaLabel: 'Find dashboard',
                },
              ],
              getIsActive: expect.any(Function),
            },
          ],
        },
        {
          id: 'dashboards_recent',
          title: 'Recent',
          animateItemReorder: true,
          emptyState: {
            iconType: 'clockCounter',
            message: 'Recently visited dashboards will be shown here',
          },
          children: [],
        },
      ],
      getIsActive: expect.any(Function),
    });
  });

  it('adds recent and starred sections when provided', () => {
    const node = createDashboardsNavigationNode({
      recentDashboards: [
        {
          id: 'recent_1',
          title: 'Recent dashboard',
          href: 'http://mocked/kibana/foo/app/dashboards#/view/1',
        },
      ],
      starredDashboards: [
        {
          id: 'starred_2',
          title: 'Starred dashboard',
          href: 'http://mocked/kibana/foo/app/dashboards#/view/2',
        },
      ],
    });

    expect(node.children).toHaveLength(3);
    expect(node.children?.[1]).toMatchObject({
      id: 'dashboards_starred',
      title: 'Starred',
    });
    expect(node.children?.[2]).toMatchObject({
      id: 'dashboards_recent',
      title: 'Recent',
      animateItemReorder: true,
      emptyState: {
        iconType: 'clockCounter',
        message: 'Recently visited dashboards will be shown here',
      },
    });
  });

  it('always shows the recent section with an empty state in the side panel', () => {
    const deepLinks = {
      [DASHBOARD_APP_ID]: getDeepLink(DASHBOARD_APP_ID, 'app/dashboards#/list', 'Dashboards'),
      [DASHBOARD_ALL_NAV_LINK]: getDeepLink(
        DASHBOARD_ALL_NAV_LINK,
        'app/dashboards#/list',
        'All dashboards'
      ),
      [DASHBOARD_CREATE_NAV_LINK]: getDeepLink(
        DASHBOARD_CREATE_NAV_LINK,
        'app/dashboards#/create',
        'Create dashboard'
      ),
    };

    const { navigationTreeUI } = parseNavigationTree(
      'oblt',
      {
        body: [createDashboardsNavigationNode()],
      },
      { deepLinks, cloudLinks: {} }
    );

    const { navItems } = toNavigationItems(navigationTreeUI, [], [], new PanelStateManager());
    const dashboardsItem = navItems.primaryItems.find((item) => item.id === DASHBOARD_APP_ID);

    expect(dashboardsItem?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'dashboards_recent',
          label: 'Recent',
          animateItemReorder: true,
          items: [],
          emptyState: {
            iconType: 'clockCounter',
            message: 'Recently visited dashboards will be shown here',
          },
        }),
      ])
    );
  });

  it('creates secondary panel sections when the dashboards app link is registered', () => {
    const deepLinks = {
      [DASHBOARD_APP_ID]: getDeepLink(DASHBOARD_APP_ID, 'app/dashboards#/list', 'Dashboards'),
      [DASHBOARD_ALL_NAV_LINK]: getDeepLink(
        DASHBOARD_ALL_NAV_LINK,
        'app/dashboards#/list',
        'All dashboards'
      ),
      [DASHBOARD_CREATE_NAV_LINK]: getDeepLink(
        DASHBOARD_CREATE_NAV_LINK,
        'app/dashboards#/create',
        'Create dashboard'
      ),
    };

    const { navigationTreeUI } = parseNavigationTree(
      'oblt',
      {
        body: [
          createDashboardsNavigationNode({
            recentDashboards: [
              {
                id: 'recent_1',
                title: 'Recent dashboard',
                href: 'http://mocked/kibana/foo/app/dashboards#/view/1',
              },
            ],
            starredDashboards: [
              {
                id: 'starred_2',
                title: 'Starred dashboard',
                href: 'http://mocked/kibana/foo/app/dashboards#/view/2',
              },
            ],
          }),
        ],
      },
      { deepLinks, cloudLinks: {} }
    );

    const { navItems } = toNavigationItems(navigationTreeUI, [], [], new PanelStateManager());
    const dashboardsItem = navItems.primaryItems.find((item) => item.id === DASHBOARD_APP_ID);

    expect(dashboardsItem?.href).toBe('/foo/app/dashboards#/list');

    expect(dashboardsItem?.panelNestedPanels).toEqual([
      {
        id: 'dashboards_search',
        title: 'Find dashboard',
      },
    ]);

    expect(dashboardsItem?.panelFooterActions).toEqual([
      expect.objectContaining({
        id: 'dashboards_create',
        label: 'Create dashboard',
        iconType: 'plus',
        href: 'http://mocked/kibana/foo/app/dashboards#/create',
      }),
    ]);

    expect(dashboardsItem?.sections).toEqual([
      {
        id: 'dashboards_overview',
        label: undefined,
        items: [
          expect.objectContaining({
            id: DASHBOARD_ALL_NAV_ITEM_ID,
            label: 'All dashboards',
            href: '/foo/app/dashboards#/list',
            itemActions: [
              expect.objectContaining({
                id: 'dashboards_search',
                iconType: 'search',
                opensNestedPanel: 'dashboards_search',
                'aria-label': 'Find dashboard',
              }),
            ],
          }),
        ],
      },
      {
        id: 'dashboards_starred',
        label: 'Starred',
        items: [
          expect.objectContaining({
            id: 'starred_2',
            label: 'Starred dashboard',
            href: 'http://mocked/kibana/foo/app/dashboards#/view/2',
          }),
        ],
      },
      {
        id: 'dashboards_recent',
        label: 'Recent',
        animateItemReorder: true,
        items: [
          expect.objectContaining({
            id: 'recent_1',
            label: 'Recent dashboard',
            href: 'http://mocked/kibana/foo/app/dashboards#/view/1',
          }),
        ],
      },
    ]);
  });

  it('uses the all dashboards listing href for the primary dashboards item even with last active history', () => {
    const deepLinks = {
      [DASHBOARD_APP_ID]: getDeepLink(DASHBOARD_APP_ID, 'app/dashboards#/list', 'Dashboards'),
      [DASHBOARD_ALL_NAV_LINK]: getDeepLink(
        DASHBOARD_ALL_NAV_LINK,
        'app/dashboards#/list',
        'All dashboards'
      ),
      [DASHBOARD_CREATE_NAV_LINK]: getDeepLink(
        DASHBOARD_CREATE_NAV_LINK,
        'app/dashboards#/create',
        'Create dashboard'
      ),
    };

    const { navigationTreeUI } = parseNavigationTree(
      'oblt',
      {
        body: [
          createDashboardsNavigationNode({
            recentDashboards: [
              {
                id: 'recent_1',
                title: 'Recent dashboard',
                href: 'http://mocked/kibana/foo/app/dashboards#/view/1',
              },
            ],
          }),
        ],
      },
      { deepLinks, cloudLinks: {} }
    );

    const panelStateManager = new PanelStateManager();
    panelStateManager.setPanelLastActive(DASHBOARD_APP_ID, 'recent_1');

    const { navItems } = toNavigationItems(navigationTreeUI, [], [], panelStateManager);
    const dashboardsItem = navItems.primaryItems.find((item) => item.id === DASHBOARD_APP_ID);

    expect(dashboardsItem?.href).toBe('/foo/app/dashboards#/list');
  });

  it('highlights only the last-clicked item when the same dashboard is in recent and starred', () => {
    const sharedHref = 'http://mocked/kibana/foo/app/dashboards#/view/flights';
    const deepLinks = {
      [DASHBOARD_APP_ID]: getDeepLink(DASHBOARD_APP_ID, 'app/dashboards#/list', 'Dashboards'),
      [DASHBOARD_ALL_NAV_LINK]: getDeepLink(
        DASHBOARD_ALL_NAV_LINK,
        'app/dashboards#/list',
        'All dashboards'
      ),
      [DASHBOARD_CREATE_NAV_LINK]: getDeepLink(
        DASHBOARD_CREATE_NAV_LINK,
        'app/dashboards#/create',
        'Create dashboard'
      ),
    };

    const { navigationTreeUI } = parseNavigationTree(
      'oblt',
      {
        body: [
          createDashboardsNavigationNode({
            recentDashboards: [
              {
                id: 'recent_flights',
                title: 'Flights',
                href: sharedHref,
              },
            ],
            starredDashboards: [
              {
                id: 'starred_flights',
                title: 'Flights',
                href: sharedHref,
              },
            ],
          }),
        ],
      },
      { deepLinks, cloudLinks: {} }
    );

    const starredNode = navigationTreeUI.body[0].children![1].children![0];
    const recentNode = navigationTreeUI.body[0].children![2].children![0];
    const panelNode = navigationTreeUI.body[0];
    const starredSection = navigationTreeUI.body[0].children![1];
    const recentSection = navigationTreeUI.body[0].children![2];

    const panelStateManager = new PanelStateManager();
    panelStateManager.setPanelLastActive(DASHBOARD_APP_ID, 'starred_flights');

    const { activeItemId } = toNavigationItems(
      navigationTreeUI,
      [
        [panelNode, recentSection, recentNode],
        [panelNode, starredSection, starredNode],
      ],
      [],
      panelStateManager
    );

    expect(activeItemId).toBe('starred_flights');
  });
});
