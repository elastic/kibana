/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './setup_jest_mocks';
import React from 'react';
import { type RenderResult } from '@testing-library/react';
import { type Observable, of } from 'rxjs';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';

import { navLinksMock } from '../mocks/src/navlinks';
import { Navigation } from '../src/ui/components/navigation';
import type { RootNavigationItemDefinition } from '../src/ui/types';

import { renderNavigation, TestType, type ProjectNavigationChangeListener } from './utils';

const errorHandler = (type: TestType) => (e: Error) => {
  const err = new Error(`Failed to run tests for ${type}.`);
  err.stack = e.stack;
  // eslint-disable-next-line no-console
  console.error(err.message);
  throw err;
};

describe('builds navigation tree', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('render reference UI and build the navigation tree', async () => {
    const onProjectNavigationChange: jest.MockedFunction<ProjectNavigationChangeListener> =
      jest.fn();

    const runTests = async (type: TestType, { findByTestId }: RenderResult) => {
      try {
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
        return navigationTree;
      } catch (e) {
        errorHandler(type)(e);
      }
    };

    // -- Default navigation
    {
      const renderResult = await renderNavigation({
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

      const navigationTree = await runTests('treeDef', renderResult);

      expect(navigationTree).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
              Object {
                "children": undefined,
                "deepLink": undefined,
                "href": "https://foo",
                "id": "item1",
                "isActive": false,
                "isGroup": false,
                "path": Array [
                  "group1",
                  "item1",
                ],
                "sideNavStatus": "visible",
                "title": "Item 1",
              },
              Object {
                "children": undefined,
                "deepLink": undefined,
                "href": "https://foo",
                "id": "item2",
                "isActive": false,
                "isGroup": false,
                "path": Array [
                  "group1",
                  "item2",
                ],
                "sideNavStatus": "visible",
                "title": "Item 2",
              },
              Object {
                "children": Array [
                  Object {
                    "children": undefined,
                    "deepLink": undefined,
                    "href": "https://foo",
                    "id": "item1",
                    "isActive": false,
                    "isGroup": false,
                    "path": Array [
                      "group1",
                      "group1A",
                      "item1",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Group 1A Item 1",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "children": undefined,
                        "deepLink": undefined,
                        "href": "https://foo",
                        "id": "item1",
                        "isActive": false,
                        "isGroup": false,
                        "path": Array [
                          "group1",
                          "group1A",
                          "group1A_1",
                          "item1",
                        ],
                        "sideNavStatus": "visible",
                        "title": "Group 1A_1 Item 1",
                      },
                    ],
                    "deepLink": undefined,
                    "href": undefined,
                    "id": "group1A_1",
                    "isActive": false,
                    "isGroup": true,
                    "path": Array [
                      "group1",
                      "group1A",
                      "group1A_1",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Group1A_1",
                  },
                ],
                "deepLink": undefined,
                "href": undefined,
                "id": "group1A",
                "isActive": true,
                "isGroup": true,
                "path": Array [
                  "group1",
                  "group1A",
                ],
                "sideNavStatus": "visible",
                "title": "Group1A",
              },
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "group1",
            "isActive": true,
            "isGroup": true,
            "path": Array [
              "group1",
            ],
            "sideNavStatus": "visible",
            "title": "",
            "type": "navGroup",
          },
        ]
      `);

      onProjectNavigationChange.mockReset();
      renderResult.unmount();
    }

    // -- With UI Components
    {
      const renderResult = await renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="group1" defaultIsCollapsed={false}>
              <Navigation.Item id="item1" title="Item 1" href="https://foo" />
              <Navigation.Item id="item2" title="Item 2" href="https://foo" />
              <Navigation.Group id="group1A" title="Group1A">
                <Navigation.Item id="item1" title="Group 1A Item 1" href="https://foo" />
                <Navigation.Group id="group1A_1" title="Group1A_1">
                  <Navigation.Item id="item1" title="Group 1A_1 Item 1" href="https://foo" />
                </Navigation.Group>
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        ),
        onProjectNavigationChange,
      });

      const navigationTree = await runTests('uiComponents', renderResult);

      expect(navigationTree).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
              Object {
                "children": undefined,
                "deepLink": undefined,
                "href": "https://foo",
                "id": "item1",
                "isActive": false,
                "isGroup": false,
                "path": Array [
                  "group1",
                  "item1",
                ],
                "sideNavStatus": "visible",
                "title": "Item 1",
              },
              Object {
                "children": undefined,
                "deepLink": undefined,
                "href": "https://foo",
                "id": "item2",
                "isActive": false,
                "isGroup": false,
                "path": Array [
                  "group1",
                  "item2",
                ],
                "sideNavStatus": "visible",
                "title": "Item 2",
              },
              Object {
                "children": Array [
                  Object {
                    "children": undefined,
                    "deepLink": undefined,
                    "href": "https://foo",
                    "id": "item1",
                    "isActive": false,
                    "isGroup": false,
                    "path": Array [
                      "group1",
                      "group1A",
                      "item1",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Group 1A Item 1",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "children": undefined,
                        "deepLink": undefined,
                        "href": "https://foo",
                        "id": "item1",
                        "isActive": false,
                        "isGroup": false,
                        "path": Array [
                          "group1",
                          "group1A",
                          "group1A_1",
                          "item1",
                        ],
                        "sideNavStatus": "visible",
                        "title": "Group 1A_1 Item 1",
                      },
                    ],
                    "deepLink": undefined,
                    "href": undefined,
                    "id": "group1A_1",
                    "isActive": false,
                    "isGroup": true,
                    "path": Array [
                      "group1",
                      "group1A",
                      "group1A_1",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Group1A_1",
                  },
                ],
                "deepLink": undefined,
                "href": undefined,
                "id": "group1A",
                "isActive": false,
                "isGroup": true,
                "path": Array [
                  "group1",
                  "group1A",
                ],
                "sideNavStatus": "visible",
                "title": "Group1A",
              },
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "group1",
            "isActive": true,
            "isGroup": true,
            "path": Array [
              "group1",
            ],
            "sideNavStatus": "visible",
            "title": "",
          },
        ]
      `);
    }
  });

  test('should read the title from deeplink, prop or React children', async () => {
    const navLinks$: Observable<ChromeNavLink[]> = of([
      ...navLinksMock,
      {
        id: 'item1',
        title: 'Title from deeplink',
        baseUrl: '',
        url: '',
        href: '',
      },
    ]);

    const onProjectNavigationChange: jest.MockedFunction<ProjectNavigationChangeListener> =
      jest.fn();

    const runTests = (type: TestType) => {
      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [{ navigationTree }] = lastCall;

      const groupChildren = navigationTree[0].children?.[0].children;

      if (!groupChildren) {
        throw new Error('Expected group children to be defined');
      }

      try {
        expect(groupChildren[0].title).toBe('Title from deeplink');
        expect(groupChildren[1].title).toBe('Overwrite deeplink title');
        expect(groupChildren[2].title).toBe('Title in props'); // Unknown deeplink, has not been rendered
      } catch (e) {
        errorHandler(type)(e);
      }

      return groupChildren;
    };

    // -- Default navigation
    {
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

      const renderResult = await renderNavigation({
        navTreeDef: { body: navigationBody },
        services: { navLinks$ },
        onProjectNavigationChange,
      });

      const groupChildren = runTests('treeDef');
      expect(groupChildren[3]).toBeUndefined(); // Unknown deeplink, has not been rendered

      onProjectNavigationChange.mockReset();
      renderResult.unmount();
    }

    // -- With UI components
    {
      await renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="root">
              <Navigation.Group id="group1">
                {/* Title from deeplink */}
                <Navigation.Item<any> id="item1" link="item1" />
                <Navigation.Item<any> id="item2" link="item1" title="Overwrite deeplink title" />
                <Navigation.Item id="item3" title="Title in props" />
                <Navigation.Item<any> id="item4" link="unknown" title="Should not be rendered" />
                <Navigation.Item id="item5">Title in children</Navigation.Item>
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        ),
        services: { navLinks$ },
        onProjectNavigationChange,
      });

      const groupChildren = runTests('uiComponents');
      // "item4" has been skipped as it is an unknown deeplink and we have the next item in the list
      expect(groupChildren[3].title).toBe('Title in children');
    }
  });

  test('should not render the group if it does not have children AND no href or deeplink', async () => {
    const navLinks$: Observable<ChromeNavLink[]> = of([
      {
        id: 'item1',
        title: 'Title from deeplink',
        baseUrl: '',
        url: '',
        href: '',
      },
    ]);
    const onProjectNavigationChange: jest.MockedFunction<ProjectNavigationChangeListener> =
      jest.fn();

    const runTests = (type: TestType, { queryByTestId }: RenderResult) => {
      expect(onProjectNavigationChange).toHaveBeenCalled();

      try {
        // Check the DOM
        expect(queryByTestId(/nav-group-root.group1/)).toBeNull();
        expect(queryByTestId(/nav-item-root.group2.item1/)).toBeVisible();

        // Check the navigation tree
        const lastCall =
          onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
        const [navTree] = lastCall;
        const [rootNode] = navTree.navigationTree;
        expect(rootNode.id).toBe('root');
        expect(rootNode.children?.length).toBe(1); // only 1 group --> "group1" has been removed
        expect(rootNode.children?.[0]?.id).toBe('group2');
        return navTree;
      } catch (e) {
        errorHandler(type)(e);
      }
    };

    // -- Default navigation
    {
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

      const renderResult = await renderNavigation({
        navTreeDef: { body: navigationBody },
        services: { navLinks$ },
        onProjectNavigationChange,
      });

      await runTests('treeDef', renderResult);

      onProjectNavigationChange.mockReset();
      renderResult.unmount();
    }

    // -- With UI components
    {
      const renderResult = await renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="root" isCollapsible={false}>
              <Navigation.Group id="group1" title="Hello">
                <Navigation.Item<any> link="notRegistered" />
              </Navigation.Group>
              <Navigation.Group id="group2">
                <Navigation.Item<any> link="item1" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        ),
        services: { navLinks$ },
        onProjectNavigationChange,
      });

      await runTests('uiComponents', renderResult);
    }
  });

  test('should render recently accessed items', async () => {
    const recentlyAccessed$ = of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]);

    const runTests = async (type: TestType, { findByTestId }: RenderResult) => {
      try {
        expect(await findByTestId('nav-bucket-recentlyAccessed')).toBeVisible();
        expect((await findByTestId('nav-bucket-recentlyAccessed')).textContent).toBe(
          'RecentThis is an exampleAnother example'
        );
      } catch (e) {
        errorHandler(type)(e);
      }
    };

    // -- Default navigation
    {
      const navigationBody: Array<RootNavigationItemDefinition<any>> = [
        {
          type: 'recentlyAccessed',
        },
      ];

      const renderResult = await renderNavigation({
        navTreeDef: {
          body: navigationBody,
        },
        services: { recentlyAccessed$ },
      });

      await runTests('treeDef', renderResult);
      renderResult.unmount();
    }

    // -- With UI Components
    {
      const renderResult = await renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="root">
              <Navigation.Group id="group1">
                <Navigation.RecentlyAccessed />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        ),
        services: { recentlyAccessed$ },
      });

      await runTests('uiComponents', renderResult);
    }
  });
});
