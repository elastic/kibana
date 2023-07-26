/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { type Observable, of, BehaviorSubject } from 'rxjs';
import type {
  ChromeNavLink,
  ChromeProjectNavigation,
  ChromeProjectNavigationNode,
} from '@kbn/core-chrome-browser';

import { getServicesMock } from '../../mocks/src/jest';
import { NavigationProvider } from '../services';
import { DefaultNavigation } from './default_navigation';
import type { ProjectNavigationTreeDefinition, RootNavigationItemDefinition } from './types';
import { navLinksMock } from '../../mocks/src/navlinks';
import { act } from 'react-dom/test-utils';

// There is a 100ms debounce to update project navigation tree
const SET_NAVIGATION_DELAY = 100;

describe('<DefaultNavigation />', () => {
  const services = getServicesMock();
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('builds custom navigation tree', () => {
    test('render reference UI and build the navigation tree', async () => {
      const onProjectNavigationChange = jest.fn();

      const navigationBody: RootNavigationItemDefinition[] = [
        {
          type: 'navGroup',
          id: 'group1',
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              href: 'http://foo',
            },
            {
              id: 'item2',
              title: 'Item 2',
              href: 'http://foo',
            },
            {
              id: 'group1A',
              title: 'Group1A',
              children: [
                {
                  id: 'item1',
                  title: 'Group 1A Item 1',
                  href: 'http://foo',
                },
                {
                  id: 'group1A_1',
                  title: 'Group1A_1',
                  children: [
                    {
                      id: 'item1',
                      title: 'Group 1A_1 Item 1',
                      href: 'http://foo',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const { findByTestId } = render(
        <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
          <DefaultNavigation navigationTree={{ body: navigationBody }} />
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(await findByTestId(/nav-item-group1.item1/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.item2/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.group1A\s/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.group1A.item1/)).toBeVisible();
      expect(await findByTestId(/nav-item-group1.group1A.group1A_1/)).toBeVisible();

      // Click the last group to expand and show the last depth
      (await findByTestId(/nav-item-group1.group1A.group1A_1/)).click();

      expect(await findByTestId(/nav-item-group1.group1A.group1A_1.item1/)).toBeVisible();

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
                "href": "http://foo",
                "id": "item1",
                "isActive": false,
                "path": Array [
                  "group1",
                  "item1",
                ],
                "renderItem": undefined,
                "title": "Item 1",
              },
              Object {
                "children": undefined,
                "deepLink": undefined,
                "href": "http://foo",
                "id": "item2",
                "isActive": false,
                "path": Array [
                  "group1",
                  "item2",
                ],
                "renderItem": undefined,
                "title": "Item 2",
              },
              Object {
                "children": Array [
                  Object {
                    "children": undefined,
                    "deepLink": undefined,
                    "href": "http://foo",
                    "id": "item1",
                    "isActive": false,
                    "path": Array [
                      "group1",
                      "group1A",
                      "item1",
                    ],
                    "renderItem": undefined,
                    "title": "Group 1A Item 1",
                  },
                  Object {
                    "children": Array [
                      Object {
                        "children": undefined,
                        "deepLink": undefined,
                        "href": "http://foo",
                        "id": "item1",
                        "isActive": false,
                        "path": Array [
                          "group1",
                          "group1A",
                          "group1A_1",
                          "item1",
                        ],
                        "renderItem": undefined,
                        "title": "Group 1A_1 Item 1",
                      },
                    ],
                    "deepLink": undefined,
                    "href": undefined,
                    "id": "group1A_1",
                    "isActive": false,
                    "path": Array [
                      "group1",
                      "group1A",
                      "group1A_1",
                    ],
                    "title": "Group1A_1",
                  },
                ],
                "deepLink": undefined,
                "href": undefined,
                "id": "group1A",
                "isActive": false,
                "path": Array [
                  "group1",
                  "group1A",
                ],
                "title": "Group1A",
              },
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "group1",
            "isActive": false,
            "path": Array [
              "group1",
            ],
            "title": "",
            "type": "navGroup",
          },
        ]
      `);
    });

    test('should read the title from deeplink', async () => {
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

      const onProjectNavigationChange = jest.fn();

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
                  link: 'unknown', // Unknown deeplink
                  title: 'Should not be rendered',
                },
              ],
            },
          ],
        },
      ];

      render(
        <NavigationProvider
          {...services}
          navLinks$={navLinks$}
          onProjectNavigationChange={onProjectNavigationChange}
        >
          <DefaultNavigation navigationTree={{ body: navigationBody }} />
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
                    "path": Array [
                      "root",
                      "group1",
                      "item1",
                    ],
                    "renderItem": undefined,
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
                    "path": Array [
                      "root",
                      "group1",
                      "item2",
                    ],
                    "renderItem": undefined,
                    "title": "Overwrite deeplink title",
                  },
                ],
                "deepLink": undefined,
                "href": undefined,
                "id": "group1",
                "isActive": false,
                "path": Array [
                  "root",
                  "group1",
                ],
                "title": "",
              },
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "root",
            "isActive": false,
            "path": Array [
              "root",
            ],
            "title": "",
            "type": "navGroup",
          },
        ]
      `);
    });

    test('should allow href for absolute links', async () => {
      const onProjectNavigationChange = jest.fn();

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
                  title: 'Absolute link',
                  href: 'https://example.com',
                },
              ],
            },
          ],
        },
      ];

      render(
        <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
          <DefaultNavigation navigationTree={{ body: navigationBody }} />
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
                "children": Array [
                  Object {
                    "children": undefined,
                    "deepLink": undefined,
                    "href": "https://example.com",
                    "id": "item1",
                    "isActive": false,
                    "path": Array [
                      "root",
                      "group1",
                      "item1",
                    ],
                    "renderItem": undefined,
                    "title": "Absolute link",
                  },
                ],
                "deepLink": undefined,
                "href": undefined,
                "id": "group1",
                "isActive": false,
                "path": Array [
                  "root",
                  "group1",
                ],
                "title": "",
              },
            ],
            "deepLink": undefined,
            "href": undefined,
            "id": "root",
            "isActive": false,
            "path": Array [
              "root",
            ],
            "title": "",
            "type": "navGroup",
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
                  title: 'Absolute link',
                  href: '../dashboards',
                },
              ],
            },
          ],
        },
      ];

      const expectToThrow = () => {
        render(
          <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
            <DefaultNavigation navigationTree={{ body: navigationBody }} />
          </NavigationProvider>
        );
      };

      expect(expectToThrow).toThrowError('href must be an absolute URL. Node id [item1].');
      // @ts-expect-error we're mocking the console so "mockImplementation" exists
      // eslint-disable-next-line no-console
      console.error.mockRestore();
    });

    test('should render recently accessed items', async () => {
      const recentlyAccessed$ = of([
        { label: 'This is an example', link: '/app/example/39859', id: '39850' },
        { label: 'Another example', link: '/app/example/5235', id: '5235' },
      ]);

      const navigationBody: RootNavigationItemDefinition[] = [
        {
          type: 'recentlyAccessed',
        },
      ];

      const { findByTestId } = render(
        <NavigationProvider {...services} recentlyAccessed$={recentlyAccessed$}>
          <DefaultNavigation navigationTree={{ body: navigationBody }} />
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

      const navigationBody: RootNavigationItemDefinition[] = [
        {
          type: 'navGroup',
          id: 'group1',
          children: [
            {
              link: 'item1' as any,
              title: 'Item 1',
            },
            {
              link: 'item2' as any,
              title: 'Item 2',
            },
          ],
        },
      ];

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
        <NavigationProvider {...services} navLinks$={navLinks$} activeNodes$={getActiveNodes$()}>
          <DefaultNavigation navigationTree={{ body: navigationBody }} />
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(await findByTestId(/nav-item-group1.item1/)).toHaveClass(
        'euiSideNavItemButton-isSelected'
      );
      expect(await findByTestId(/nav-item-group1.item2/)).not.toHaveClass(
        'euiSideNavItemButton-isSelected'
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

      const navigationBody: RootNavigationItemDefinition[] = [
        {
          type: 'navGroup',
          id: 'group1',
          children: [
            {
              link: 'item1' as any,
              title: 'Item 1',
              getIsActive: () => true,
            },
          ],
        },
      ];

      const activeNodes$ = new BehaviorSubject<ChromeProjectNavigationNode[][]>([[]]);
      const getActiveNodes$ = () => activeNodes$;

      const onProjectNavigationChange = (nav: ChromeProjectNavigation) => {
        nav.navigationTree.forEach((node) => {
          if (node.children) {
            node.children.forEach((child) => {
              if (child.getIsActive) {
                activeNodes$.next([[child]]);
              }
            });
          }
        });
      };

      const { findByTestId } = render(
        <NavigationProvider
          {...services}
          navLinks$={navLinks$}
          activeNodes$={getActiveNodes$()}
          onProjectNavigationChange={onProjectNavigationChange}
        >
          <DefaultNavigation navigationTree={{ body: navigationBody }} />
        </NavigationProvider>
      );

      await act(async () => {
        jest.advanceTimersByTime(SET_NAVIGATION_DELAY);
      });

      expect(await findByTestId(/nav-item-group1.item1/)).toHaveClass(
        'euiSideNavItemButton-isSelected'
      );
    });
  });

  describe('builds the full navigation tree when only custom project is provided', () => {
    test('reading the title from config or deeplink', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
        ...navLinksMock,
        {
          id: 'item2',
          title: 'Title from deeplink!',
          baseUrl: '',
          url: '',
          href: '',
        },
      ]);

      const onProjectNavigationChange = jest.fn();

      // Custom project navigation tree definition
      const projectNavigationTree: ProjectNavigationTreeDefinition<any> = [
        {
          id: 'group1',
          title: 'Group 1',
          children: [
            {
              id: 'item1',
              title: 'Item 1',
            },
            {
              id: 'item2',
              link: 'item2', // Title from deeplink
            },
            {
              id: 'item3',
              link: 'item2',
              title: 'Deeplink title overriden', // Override title from deeplink
            },
            {
              link: 'disabled',
              title: 'Should NOT be there',
            },
          ],
        },
      ];

      render(
        <NavigationProvider
          {...services}
          navLinks$={navLinks$}
          onProjectNavigationChange={onProjectNavigationChange}
        >
          <DefaultNavigation projectNavigationTree={projectNavigationTree} />
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

      // The project navigation tree passed
      expect(navTreeGenerated.navigationTree).toMatchSnapshot();
    });

    describe('cloud links', () => {
      test('render the cloud link', async () => {
        const { findByTestId } = render(
          <NavigationProvider {...services}>
            <DefaultNavigation projectNavigationTree={[]} />
          </NavigationProvider>
        );

        expect(
          await (
            await findByTestId(
              /nav-item-project_settings_project_nav.settings.cloudLinkUserAndRoles/
            )
          ).textContent
        ).toBe('Mock Users & RolesExternal link');

        expect(
          await (
            await findByTestId(/nav-item-project_settings_project_nav.settings.cloudLinkBilling/)
          ).textContent
        ).toBe('Mock Billing & SubscriptionsExternal link');
      });
    });
  });
});
