/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ChromeNavLink,
  ChromeProjectNavigation,
  ChromeProjectNavigationNode,
} from '@kbn/core-chrome-browser';
import { render } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject, of, type Observable } from 'rxjs';
import { getServicesMock } from '../../../mocks/src/jest';
import { NavigationProvider } from '../../services';
import { Navigation } from './navigation';

// There is a 100ms debounce to update project navigation tree
const SET_NAVIGATION_DELAY = 100;

describe('<Navigation />', () => {
  const services = getServicesMock();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('builds the navigation tree', () => {
    test('render reference UI and build the navigation tree', async () => {
      const onProjectNavigationChange = jest.fn();

      const { findByTestId } = render(
        <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
          <Navigation>
            <Navigation.Group id="group1" defaultIsCollapsed={false}>
              <Navigation.Item id="item1" title="Item 1" href="https://foo" />
              <Navigation.Item id="item2" title="Item 2" href="https://foo" />
              <Navigation.Group id="group1A" title="Group1A" defaultIsCollapsed={false}>
                <Navigation.Item id="item1" title="Group 1A Item 1" href="https://foo" />
                <Navigation.Group id="group1A_1" title="Group1A_1" defaultIsCollapsed={false}>
                  <Navigation.Item id="item1" title="Group 1A_1 Item 1" href="https://foo" />
                </Navigation.Group>
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(await findByTestId(/nav-item-group1.item1/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.item2/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.group1A\s/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.group1A.item1/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.group1A.group1A_1\s/)).toBeVisible();

      // Click the last group to expand and show the last depth
      (await findByTestId(/nav-item-group1.group1A.group1A_1\s/)).click();

      expect(await findByTestId(/nav-item-group1.group1A.group1A_1.item1/)).toBeVisible();

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTree] = lastCall;

      expect(navTree.navigationTree).toMatchInlineSnapshot(`
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
                    "isActive": true,
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
          },
        ]
      `);
    });

    test('should read the title from props, children or deeplink', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
        {
          id: 'item1',
          title: 'Title from deeplink',
          baseUrl: '',
          url: '',
          href: '',
        },
      ]);

      const onProjectNavigationChange = jest.fn();

      render(
        <NavigationProvider
          {...services}
          navLinks$={navLinks$}
          onProjectNavigationChange={onProjectNavigationChange}
        >
          <Navigation>
            <Navigation.Group id="root">
              <Navigation.Group id="group1">
                {/* Title from deeplink */}
                <Navigation.Item<any> id="item1" link="item1" />
                <Navigation.Item<any> id="item2" link="item1" title="Overwrite deeplink title" />
                <Navigation.Item id="item3" title="Title in props" />
                <Navigation.Item id="item4">Title in children</Navigation.Item>
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTree] = lastCall;

      expect(navTree.navigationTree).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "children": undefined,
                    "deepLink": Object {
                      "baseUrl": "",
                      "href": "",
                      "id": "item1",
                      "title": "Title from deeplink",
                      "url": "",
                    },
                    "href": undefined,
                    "id": "item1",
                    "isActive": false,
                    "isGroup": false,
                    "path": Array [
                      "root",
                      "group1",
                      "item1",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Title from deeplink",
                  },
                  Object {
                    "children": undefined,
                    "deepLink": Object {
                      "baseUrl": "",
                      "href": "",
                      "id": "item1",
                      "title": "Title from deeplink",
                      "url": "",
                    },
                    "href": undefined,
                    "id": "item2",
                    "isActive": false,
                    "isGroup": false,
                    "path": Array [
                      "root",
                      "group1",
                      "item2",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Overwrite deeplink title",
                  },
                  Object {
                    "children": undefined,
                    "deepLink": undefined,
                    "href": undefined,
                    "id": "item3",
                    "isActive": false,
                    "isGroup": false,
                    "path": Array [
                      "root",
                      "group1",
                      "item3",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Title in props",
                  },
                  Object {
                    "children": undefined,
                    "deepLink": undefined,
                    "href": undefined,
                    "id": "item4",
                    "isActive": false,
                    "isGroup": false,
                    "path": Array [
                      "root",
                      "group1",
                      "item4",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Title in children",
                  },
                ],
                "deepLink": undefined,
                "href": undefined,
                "id": "group1",
                "isActive": false,
                "isGroup": true,
                "path": Array [
                  "root",
                  "group1",
                ],
                "sideNavStatus": "visible",
                "title": "",
              },
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "root",
            "isActive": false,
            "isGroup": true,
            "path": Array [
              "root",
            ],
            "sideNavStatus": "visible",
            "title": "",
          },
        ]
      `);
    });

    test('should filter out unknown deeplinks', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
        {
          id: 'item1',
          title: 'Title from deeplink',
          baseUrl: '',
          url: '',
          href: '',
        },
      ]);

      const onProjectNavigationChange = jest.fn();

      const { findByTestId } = render(
        <NavigationProvider
          {...services}
          navLinks$={navLinks$}
          onProjectNavigationChange={onProjectNavigationChange}
        >
          <Navigation>
            <Navigation.Group id="root" defaultIsCollapsed={false}>
              <Navigation.Group id="group1" defaultIsCollapsed={false}>
                {/* Title from deeplink */}
                <Navigation.Item<any> id="item1" link="item1" />
                {/* Should not appear */}
                <Navigation.Item<any> id="unknownLink" link="unknown" title="Should NOT be there" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(await findByTestId(/nav-item-root.group1.item1/)).toBeVisible();
      expect(await findByTestId(/nav-item-root.group1.item1/)).toBeVisible();

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTree] = lastCall;

      expect(navTree.navigationTree).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
              Object {
                "children": Array [
                  Object {
                    "children": undefined,
                    "deepLink": Object {
                      "baseUrl": "",
                      "href": "",
                      "id": "item1",
                      "title": "Title from deeplink",
                      "url": "",
                    },
                    "href": undefined,
                    "id": "item1",
                    "isActive": false,
                    "isGroup": false,
                    "path": Array [
                      "root",
                      "group1",
                      "item1",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Title from deeplink",
                  },
                ],
                "deepLink": undefined,
                "href": undefined,
                "id": "group1",
                "isActive": true,
                "isGroup": true,
                "path": Array [
                  "root",
                  "group1",
                ],
                "sideNavStatus": "visible",
                "title": "",
              },
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "root",
            "isActive": true,
            "isGroup": true,
            "path": Array [
              "root",
            ],
            "sideNavStatus": "visible",
            "title": "",
          },
        ]
      `);
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
      const onProjectNavigationChange = jest.fn();

      const { queryByTestId } = render(
        <NavigationProvider
          {...services}
          navLinks$={navLinks$}
          onProjectNavigationChange={onProjectNavigationChange}
        >
          <Navigation>
            <Navigation.Group id="root" defaultIsCollapsed={false}>
              <Navigation.Group id="group1" defaultIsCollapsed={false}>
                <Navigation.Item<any> id="item1" link="notRegistered" />
              </Navigation.Group>
              <Navigation.Group id="group2" defaultIsCollapsed={false}>
                <Navigation.Item<any> id="item1" link="item1" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(queryByTestId(/nav-group-root.group1/)).toBeNull();
      expect(queryByTestId(/nav-item-root.group2.item1/)).toBeVisible();

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTree] = lastCall;

      expect(navTree.navigationTree).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
              Object {
                "children": undefined,
                "deepLink": undefined,
                "href": undefined,
                "id": "group1",
                "isActive": true,
                "isGroup": true,
                "path": Array [
                  "root",
                  "group1",
                ],
                "sideNavStatus": "visible",
                "title": "",
              },
              Object {
                "children": Array [
                  Object {
                    "children": undefined,
                    "deepLink": Object {
                      "baseUrl": "",
                      "href": "",
                      "id": "item1",
                      "title": "Title from deeplink",
                      "url": "",
                    },
                    "href": undefined,
                    "id": "item1",
                    "isActive": false,
                    "isGroup": false,
                    "path": Array [
                      "root",
                      "group2",
                      "item1",
                    ],
                    "sideNavStatus": "visible",
                    "title": "Title from deeplink",
                  },
                ],
                "deepLink": undefined,
                "href": undefined,
                "id": "group2",
                "isActive": true,
                "isGroup": true,
                "path": Array [
                  "root",
                  "group2",
                ],
                "sideNavStatus": "visible",
                "title": "",
              },
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "root",
            "isActive": true,
            "isGroup": true,
            "path": Array [
              "root",
            ],
            "sideNavStatus": "visible",
            "title": "",
          },
        ]
      `);
    });

    test('should render group preset (analytics, ml...)', async () => {
      const onProjectNavigationChange = jest.fn();

      render(
        <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
          <Navigation>
            <Navigation.Group preset="analytics" />
            <Navigation.Group preset="ml" />
            <Navigation.Group preset="devtools" />
            <Navigation.Group preset="management" />
          </Navigation>
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
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

      const { findByTestId } = render(
        <NavigationProvider {...services} recentlyAccessed$={recentlyAccessed$}>
          <Navigation>
            <Navigation.Group id="root">
              <Navigation.Group id="group1">
                <Navigation.RecentlyAccessed />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(await findByTestId('nav-bucket-recentlyAccessed')).toBeVisible();
      expect((await findByTestId('nav-bucket-recentlyAccessed')).textContent).toBe(
        'RecentThis is an exampleAnother example'
      );
    });

    test('should allow href for absolute links', async () => {
      const onProjectNavigationChange = jest.fn();

      render(
        <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
          <Navigation>
            <Navigation.Group id="group1">
              <Navigation.Item id="item1" title="Item 1" href="https://example.com" />
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated.navigationTree).toMatchInlineSnapshot(`
        Array [
          Object {
            "children": Array [
              Object {
                "children": undefined,
                "deepLink": undefined,
                "href": "https://example.com",
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
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "group1",
            "isActive": false,
            "isGroup": true,
            "path": Array [
              "group1",
            ],
            "sideNavStatus": "visible",
            "title": "",
          },
        ]
      `);
    });

    test('should throw if href is not an absolute links', async () => {
      // We'll mock the console.error to avoid dumping the (expected) error in the console
      // source: https://github.com/jestjs/jest/pull/5267#issuecomment-356605468
      jest.spyOn(console, 'error');
      // @ts-expect-error we're mocking the console so "mockImplementation" exists
      // eslint-disable-next-line no-console
      console.error.mockImplementation(() => {});

      const onProjectNavigationChange = jest.fn();

      const expectToThrow = () => {
        render(
          <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
            <Navigation>
              <Navigation.Group id="group1">
                <Navigation.Item id="item1" title="Item 1" href="../dashboards" />
              </Navigation.Group>
            </Navigation>
          </NavigationProvider>
        );
      };

      expect(expectToThrow).toThrowError('href must be an absolute URL. Node id [item1].');
      // @ts-expect-error we're mocking the console so "mockImplementation" exists
      // eslint-disable-next-line no-console
      console.error.mockRestore();
    });

    test('should set the active node', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
        {
          id: 'item1',
          title: 'Item 1',
          baseUrl: '',
          url: '',
          href: '',
        },
        {
          id: 'item2',
          title: 'Item 2',
          baseUrl: '',
          url: '',
          href: '',
        },
      ]);

      const activeNodes$ = new BehaviorSubject([
        [
          {
            id: 'group1',
            title: 'Group 1',
            path: ['group1'],
          },
          {
            id: 'item1',
            title: 'Item 1',
            path: ['group1', 'item1'],
          },
        ],
      ]);

      const getActiveNodes$ = () => activeNodes$;

      const { findByTestId } = render(
        <NavigationProvider {...services} activeNodes$={getActiveNodes$()} navLinks$={navLinks$}>
          <Navigation>
            <Navigation.Group id="group1">
              <Navigation.Item<any> link="item1" title="Item 1" />
              <Navigation.Item<any> link="item2" title="Item 2" />
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      expect((await findByTestId(/nav-item-group1.item1/)).dataset.testSubj).toMatch(
        /nav-item-isActive/
      );
      expect((await findByTestId(/nav-item-group1.item2/)).dataset.testSubj).not.toMatch(
        /nav-item-isActive/
      );

      await act(async () => {
        activeNodes$.next([
          [
            {
              id: 'group1',
              title: 'Group 1',
              path: ['group1'],
            },
            {
              id: 'item2',
              title: 'Item 2',
              path: ['group1', 'item2'],
            },
          ],
        ]);
      });

      expect((await findByTestId(/nav-item-group1.item1/)).dataset.testSubj).not.toMatch(
        /nav-item-isActive/
      );
      expect((await findByTestId(/nav-item-group1.item2/)).dataset.testSubj).toMatch(
        /nav-item-isActive/
      );
    });

    test('should override the history behaviour to set the active node', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
        {
          id: 'item1',
          title: 'Item 1',
          baseUrl: '',
          url: '',
          href: '',
        },
      ]);

      const activeNodes$ = new BehaviorSubject<ChromeProjectNavigationNode[][]>([]);
      const getActiveNodes$ = () => activeNodes$;

      const onProjectNavigationChange = (nav: ChromeProjectNavigation) => {
        nav.navigationTree.forEach((node) => {
          if (node.children) {
            node.children.forEach((child) => {
              if (child.getIsActive?.('mockLocation' as any)) {
                activeNodes$.next([[child]]);
              }
            });
          }
        });
      };

      const { findByTestId } = render(
        <NavigationProvider
          {...services}
          activeNodes$={getActiveNodes$()}
          navLinks$={navLinks$}
          onProjectNavigationChange={onProjectNavigationChange}
        >
          <Navigation>
            <Navigation.Group id="group1">
              <Navigation.Item<any>
                link="item1"
                title="Item 1"
                getIsActive={() => {
                  return true;
                }}
              />
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      jest.advanceTimersByTime(SET_NAVIGATION_DELAY);

      expect((await findByTestId(/nav-item-group1.item1/)).dataset.testSubj).toMatch(
        /nav-item-isActive/
      );
    });
  });

  describe('cloud links', () => {
    test('render the cloud link', async () => {
      const onProjectNavigationChange = jest.fn();

      const { findByTestId } = render(
        <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
          <Navigation>
            <Navigation.Group id="group1" defaultIsCollapsed={false}>
              <Navigation.Item id="cloudLink1" cloudLink="userAndRoles" />
              <Navigation.Item id="cloudLink2" cloudLink="performance" />
              <Navigation.Item id="cloudLink3" cloudLink="billingAndSub" />
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      expect(await findByTestId(/nav-item-group1.cloudLink1/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.cloudLink2/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.cloudLink3/)).toBeVisible();

      expect((await findByTestId(/nav-item-group1.cloudLink1/)).textContent).toBe(
        'Mock Users & RolesExternal link'
      );
      expect((await findByTestId(/nav-item-group1.cloudLink2/)).textContent).toBe(
        'Mock PerformanceExternal link'
      );
      expect((await findByTestId(/nav-item-group1.cloudLink3/)).textContent).toBe(
        'Mock Billing & SubscriptionsExternal link'
      );
    });
  });
});
