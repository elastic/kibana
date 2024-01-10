/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './setup_jest_mocks';
import { of } from 'rxjs';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';

import { navLinksMock } from '../mocks/src/navlinks';
import type { RootNavigationItemDefinition } from '../src/ui/types';
import { getMockFn, renderNavigation, type ProjectNavigationChangeListener } from './utils';
import { getServicesMock } from '../mocks/src/jest';
import { NavigationServices } from '../src/types';

const { cloudLinks: mockCloudLinks } = getServicesMock();

describe('builds navigation tree', () => {
  test('render reference UI and build the navigation tree', async () => {
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();

    const { findByTestId } = renderNavigation({
      navTreeDef: {
        body: [
          {
            type: 'navGroup',
            id: 'group1',
            defaultIsCollapsed: false,
            children: [
              {
                id: 'item1',
                title: 'Item 1',
                href: 'https://foo',
              },
              {
                id: 'item2',
                title: 'Item 2',
                href: 'https://foo',
              },
              {
                id: 'group1A',
                title: 'Group1A',
                defaultIsCollapsed: false,
                children: [
                  {
                    id: 'item1',
                    title: 'Group 1A Item 1',
                    href: 'https://foo',
                  },
                  {
                    id: 'group1A_1',
                    title: 'Group1A_1',
                    children: [
                      {
                        id: 'item1',
                        title: 'Group 1A_1 Item 1',
                        href: 'https://foo',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      onProjectNavigationChange,
    });

    expect(await findByTestId(/nav-item-group1.item1\s/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.item2\s/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.group1A\s/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.group1A.item1\s/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.group1A.group1A_1\s/)).toBeVisible();

    // Click the last group to expand and show the last depth
    (await findByTestId(/nav-item-group1.group1A.group1A_1\s/)).click();

    expect(await findByTestId(/nav-item-group1.group1A.group1A_1.item1/)).toBeVisible();

    expect(onProjectNavigationChange).toHaveBeenCalled();
    const lastCall =
      onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
    const [{ navigationTree }] = lastCall;

    expect(navigationTree).toMatchInlineSnapshot(`
      Array [
        Object {
          "children": Array [
            Object {
              "deepLink": undefined,
              "href": "https://foo",
              "id": "item1",
              "isElasticInternalLink": false,
              "path": "group1.item1",
              "sideNavStatus": "visible",
              "title": "Item 1",
            },
            Object {
              "deepLink": undefined,
              "href": "https://foo",
              "id": "item2",
              "isElasticInternalLink": false,
              "path": "group1.item2",
              "sideNavStatus": "visible",
              "title": "Item 2",
            },
            Object {
              "children": Array [
                Object {
                  "deepLink": undefined,
                  "href": "https://foo",
                  "id": "item1",
                  "isElasticInternalLink": false,
                  "path": "group1.group1A.item1",
                  "sideNavStatus": "visible",
                  "title": "Group 1A Item 1",
                },
                Object {
                  "children": Array [
                    Object {
                      "deepLink": undefined,
                      "href": "https://foo",
                      "id": "item1",
                      "isElasticInternalLink": false,
                      "path": "group1.group1A.group1A_1.item1",
                      "sideNavStatus": "visible",
                      "title": "Group 1A_1 Item 1",
                    },
                  ],
                  "deepLink": undefined,
                  "href": undefined,
                  "id": "group1A_1",
                  "isElasticInternalLink": false,
                  "path": "group1.group1A.group1A_1",
                  "sideNavStatus": "visible",
                  "title": "Group1A_1",
                },
              ],
              "deepLink": undefined,
              "defaultIsCollapsed": false,
              "href": undefined,
              "id": "group1A",
              "isElasticInternalLink": false,
              "path": "group1.group1A",
              "sideNavStatus": "visible",
              "title": "Group1A",
            },
          ],
          "deepLink": undefined,
          "defaultIsCollapsed": false,
          "href": undefined,
          "id": "group1",
          "isElasticInternalLink": false,
          "path": "group1",
          "sideNavStatus": "visible",
          "title": "",
          "type": "navGroup",
        },
      ]
    `);
  });

  test('should read the title from deeplink, prop or React children', async () => {
    const deepLinks$: NavigationServices['deepLinks$'] = of({
      ...navLinksMock.reduce<Record<string, ChromeNavLink>>((acc, navLink) => {
        acc[navLink.id] = navLink;
        return acc;
      }, {}),
      item1: {
        id: 'item1',
        title: 'Title from deeplink',
        baseUrl: '',
        url: '',
        href: '',
      },
    });

    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();

    const navigationBody: Array<RootNavigationItemDefinition<any>> = [
      {
        type: 'navGroup',
        id: 'root',
        children: [
          {
            id: 'group1',
            children: [
              {
                id: 'item1',
                link: 'item1', // Title from deeplink
              },
              {
                id: 'item2',
                link: 'item1', // Overwrite title from deeplink
                title: 'Overwrite deeplink title',
              },
              {
                id: 'item3',
                title: 'Title in props',
              },
              {
                id: 'item4',
                link: 'unknown', // Unknown deeplink
                title: 'Should not be rendered',
              },
            ],
          },
        ],
      },
    ];

    renderNavigation({
      navTreeDef: { body: navigationBody },
      services: { deepLinks$ },
      onProjectNavigationChange,
    });

    expect(onProjectNavigationChange).toHaveBeenCalled();
    const lastCall =
      onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
    const [{ navigationTree }] = lastCall;

    const groupChildren = navigationTree[0].children?.[0].children;

    if (!groupChildren) {
      throw new Error('Expected group children to be defined');
    }

    expect(groupChildren[0].title).toBe('Title from deeplink');
    expect(groupChildren[1].title).toBe('Overwrite deeplink title');
    expect(groupChildren[2].title).toBe('Title in props'); // Unknown deeplink, has not been rendered

    expect(groupChildren.length).toBe(3);
    expect(groupChildren[3]).toBeUndefined(); // Unknown deeplink, has not been rendered
  });

  test('should not render the group if it does not have children AND no href or deeplink', async () => {
    const deepLinks$: NavigationServices['deepLinks$'] = of({
      item1: {
        id: 'item1',
        title: 'Title from deeplink',
        baseUrl: '',
        url: '',
        href: '',
      },
    });
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();

    const navigationBody: Array<RootNavigationItemDefinition<any>> = [
      {
        type: 'navGroup',
        id: 'root',
        isCollapsible: false,
        children: [
          {
            id: 'group1',
            children: [{ link: 'notRegistered' }],
          },
          {
            id: 'group2',
            children: [{ link: 'item1' }],
          },
        ],
      },
    ];

    const { queryByTestId } = renderNavigation({
      navTreeDef: { body: navigationBody },
      services: { deepLinks$ },
      onProjectNavigationChange,
    });

    expect(onProjectNavigationChange).toHaveBeenCalled();

    // Check the DOM
    expect(queryByTestId(/nav-group-root.group1/)).toBeNull();
    expect(queryByTestId(/nav-item-root.group2.item1/)).toBeVisible();

    // Check the navigation tree
    const lastCall =
      onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
    const [navTree] = lastCall;
    const [rootNode] = navTree.navigationTree;
    expect(rootNode.id).toBe('root');
    expect(rootNode.children?.length).toBe(2);
    expect(rootNode.children?.[0]?.id).toBe('group1');
    expect(rootNode.children?.[0]?.children).toEqual([]); // No children mounted
    expect(rootNode.children?.[1]?.id).toBe('group2');
  });

  test('should render group preset (analytics, ml...)', async () => {
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();

    const navigationBody: Array<RootNavigationItemDefinition<any>> = [
      {
        type: 'preset',
        preset: 'analytics',
      },
      {
        type: 'preset',
        preset: 'ml',
      },
      {
        type: 'preset',
        preset: 'devtools',
      },
      {
        type: 'preset',
        preset: 'management',
      },
    ];

    renderNavigation({
      navTreeDef: { body: navigationBody },
      onProjectNavigationChange,
    });

    expect(onProjectNavigationChange).toHaveBeenCalled();
    const lastCall =
      onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
    const [navTreeGenerated] = lastCall;

    expect(navTreeGenerated).toEqual({
      navigationTree: expect.any(Array),
    });
  });

  test('should render recently accessed items', async () => {
    const recentlyAccessed$ = of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]);

    const navigationBody: Array<RootNavigationItemDefinition<any>> = [
      {
        type: 'recentlyAccessed',
      },
    ];

    const { findByTestId } = renderNavigation({
      navTreeDef: { body: navigationBody },
      services: { recentlyAccessed$ },
    });

    expect(await findByTestId('nav-bucket-recentlyAccessed')).toBeVisible();
    expect((await findByTestId('nav-bucket-recentlyAccessed')).textContent).toBe(
      'RecentThis is an exampleAnother example'
    );
  });

  test('should render the cloud links', async () => {
    const stripLastChar = (str: string = '') => str.substring(0, str.length - 1);

    const navigationBody: Array<RootNavigationItemDefinition<any>> = [
      {
        type: 'navGroup',
        id: 'group1',
        defaultIsCollapsed: false,
        children: [
          { id: 'cloudLink1', cloudLink: 'userAndRoles' },
          { id: 'cloudLink2', cloudLink: 'performance' },
          { id: 'cloudLink3', cloudLink: 'billingAndSub' },
          { id: 'cloudLink4', cloudLink: 'deployment' },
        ],
      },
    ];

    const { findByTestId } = renderNavigation({
      navTreeDef: { body: navigationBody },
    });

    expect(await findByTestId(/nav-item-group1.cloudLink1/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.cloudLink2/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.cloudLink3/)).toBeVisible();

    {
      const userAndRolesLink = await findByTestId(/nav-item-group1.cloudLink1/);
      expect(userAndRolesLink.textContent).toBe('Mock Users & Roles');
      const href = userAndRolesLink.getAttribute('href');
      expect(href).toBe(stripLastChar(mockCloudLinks.userAndRoles?.href));
    }

    {
      const performanceLink = await findByTestId(/nav-item-group1.cloudLink2/);
      expect(performanceLink.textContent).toBe('Mock Performance');
      const href = performanceLink.getAttribute('href');
      expect(href).toBe(stripLastChar(mockCloudLinks.performance?.href));
    }

    {
      const billingLink = await findByTestId(/nav-item-group1.cloudLink3/);
      expect(billingLink.textContent).toBe('Mock Billing & Subscriptions');
      const href = billingLink.getAttribute('href');
      expect(href).toBe(stripLastChar(mockCloudLinks.billingAndSub?.href));
    }

    {
      const deploymentLink = await findByTestId(/nav-item-group1.cloudLink4/);
      expect(deploymentLink.textContent).toBe('Mock Deployment');
      const href = deploymentLink.getAttribute('href');
      expect(href).toBe(stripLastChar(mockCloudLinks.deployment?.href));
    }
  });
});
