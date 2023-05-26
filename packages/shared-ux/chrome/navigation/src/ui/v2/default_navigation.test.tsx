/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { type Observable, of } from 'rxjs';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';

import { getServicesMock } from '../../../mocks/src/jest';
import { NavigationProvider } from '../../services';
import { DefaultNavigation } from './default_navigation';
import type {
  GroupDefinition,
  ProjectNavigationTreeDefinition,
  RootNavigationItemDefinition,
} from './types';
import { defaultNavigationTree } from './default_navigation.test.helpers';

const defaultProps = {
  homeRef: 'htts://elastic.co',
};

describe('<DefaultNavigation />', () => {
  const services = getServicesMock();

  describe('builds custom navigation tree', () => {
    test('render reference UI and build the navigation tree', async () => {
      const onProjectNavigationChange = jest.fn();

      const navigationBody: GroupDefinition[] = [
        {
          type: 'navGroup',
          id: 'group1',
          title: 'Group1',
          children: [
            {
              id: 'item1',
              title: 'Item 1',
            },
            {
              id: 'item2',
              title: 'Item 2',
            },
          ],
        },
      ];

      render(
        <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
          <DefaultNavigation
            {...defaultProps}
            navigationTree={{
              body: navigationBody,
            }}
          />
        </NavigationProvider>
      );

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated).toEqual({
        homeRef: 'htts://elastic.co',
        navigationTree: [
          {
            type: 'navGroup',
            id: 'group1',
            title: 'Group1',
            path: ['group1'],
            children: [
              {
                id: 'item1',
                title: 'Item 1',
                path: ['group1', 'item1'],
              },
              {
                id: 'item2',
                title: 'Item 2',
                path: ['group1', 'item2'],
              },
            ],
          },
        ],
      });

      // expect(await findByTestId('nav-bucket-ml')).toBeVisible();
    });

    test('should read the title from config or deeplink', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
        {
          id: 'item2',
          title: 'Title from deeplink!',
          baseUrl: '',
          url: '',
          href: '',
        },
      ]);

      const onProjectNavigationChange = jest.fn();

      const navigationBody: RootNavigationItemDefinition[] = [
        {
          type: 'navGroup',
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
          <DefaultNavigation
            {...defaultProps}
            navigationTree={{
              body: navigationBody,
            }}
          />
        </NavigationProvider>
      );

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated).toEqual({
        homeRef: 'htts://elastic.co',
        navigationTree: [
          {
            type: 'navGroup',
            id: 'group1',
            title: 'Group 1',
            path: ['group1'],
            children: [
              {
                id: 'item1',
                title: 'Item 1',
                path: ['group1', 'item1'],
              },
              {
                id: 'item2',
                title: 'Title from deeplink!', // Title from deeplink
                path: ['group1', 'item2'],
                deepLink: {
                  id: 'item2',
                  title: 'Title from deeplink!',
                  baseUrl: '',
                  url: '',
                  href: '',
                },
              },
              {
                id: 'item3',
                title: 'Deeplink title overriden', // Title overriden
                path: ['group1', 'item3'],
                deepLink: {
                  id: 'item2',
                  title: 'Title from deeplink!',
                  baseUrl: '',
                  url: '',
                  href: '',
                },
              },
            ],
          },
        ],
      });
    });

    test('should render any level of depth', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
        {
          id: 'item2',
          title: 'Title from deeplink!',
          baseUrl: '',
          url: '',
          href: '',
        },
      ]);

      const onProjectNavigationChange = jest.fn();

      const navigationBody: GroupDefinition[] = [
        {
          type: 'navGroup',
          id: 'group1',
          title: 'My Group 1',
          children: [
            {
              id: 'group1A',
              title: 'My Group 1A',
              children: [
                {
                  link: 'item2', // Title from deeplink & id from deeplink
                  children: [
                    {
                      id: 'item1',
                      title: 'My Group 1 > group 1A > Title from deeplink! > Item 1',
                    },
                  ],
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
          <DefaultNavigation
            {...defaultProps}
            navigationTree={{
              body: navigationBody,
            }}
          />
        </NavigationProvider>
      );

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated).toEqual({
        homeRef: 'htts://elastic.co',
        navigationTree: [
          {
            type: 'navGroup',
            id: 'group1',
            title: 'My Group 1',
            path: ['group1'],
            children: [
              {
                id: 'group1A',
                title: 'My Group 1A',
                path: ['group1', 'group1A'],
                children: [
                  {
                    id: 'item2',
                    path: ['group1', 'group1A', 'item2'],
                    title: 'Title from deeplink!',
                    deepLink: {
                      id: 'item2',
                      title: 'Title from deeplink!',
                      baseUrl: '',
                      url: '',
                      href: '',
                    },
                    children: [
                      {
                        id: 'item1',
                        title: 'My Group 1 > group 1A > Title from deeplink! > Item 1',
                        path: ['group1', 'group1A', 'item2', 'item1'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    // test.only('does not render in the UI the nodes that points to unexisting deeplinks', async () => {
    //   const navLinks$: Observable<ChromeNavLink[]> = of([
    //     {
    //       id: 'item2',
    //       title: 'Title from deeplink!',
    //       baseUrl: '',
    //       url: '',
    //       href: '',
    //     },
    //   ]);

    //   const onProjectNavigationChange = jest.fn();

    //   const navigationBody: GroupDefinition[] = [
    //     {
    //       type: 'navGroup',
    //       id: 'group1',
    //       title: 'My Group 1',
    //       children: [
    //         {
    //           id: 'group1A',
    //           title: 'My Group 1A',
    //           children: [
    //             {
    //               link: 'item2', // Title from deeplink & id from deeplink
    //               children: [
    //                 {
    //                   id: 'item1',
    //                   title: 'My Group 1 > group 1A > Title from deeplink! > Item 1',
    //                 },
    //               ],
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ];

    //   render(
    //     <NavigationProvider
    //       {...services}
    //       navLinks$={navLinks$}
    //       onProjectNavigationChange={onProjectNavigationChange}
    //     >
    //       <DefaultNavigation
    //         {...defaultProps}
    //         navigationTree={{
    //           body: navigationBody,
    //         }}
    //       />
    //     </NavigationProvider>
    //   );

    //   expect(onProjectNavigationChange).toHaveBeenCalled();
    //   const lastCall =
    //     onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
    //   const [navTreeGenerated] = lastCall;

    //   expect(navTreeGenerated).toEqual({
    //     homeRef: 'htts://elastic.co',
    //     navigationTree: [
    //       {
    //         type: 'navGroup',
    //         id: 'group1',
    //         title: 'My Group 1',
    //         path: ['group1'],
    //         children: [
    //           {
    //             id: 'group1A',
    //             title: 'My Group 1A',
    //             path: ['group1', 'group1A'],
    //             children: [
    //               {
    //                 id: 'item2',
    //                 path: ['group1', 'group1A', 'item2'],
    //                 title: 'Title from deeplink!',
    //                 deepLink: {
    //                   id: 'item2',
    //                   title: 'Title from deeplink!',
    //                   baseUrl: '',
    //                   url: '',
    //                   href: '',
    //                 },
    //                 children: [
    //                   {
    //                     id: 'item1',
    //                     title: 'My Group 1 > group 1A > Title from deeplink! > Item 1',
    //                     path: ['group1', 'group1A', 'item2', 'item1'],
    //                   },
    //                 ],
    //               },
    //             ],
    //           },
    //         ],
    //       },
    //     ],
    //   });
    // });
  });

  describe('builds the full navigation tree when only custom project is provided', () => {
    test('reading the title from config or deeplink', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
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
      const projectNavigationTree: ProjectNavigationTreeDefinition = [
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
          <DefaultNavigation {...defaultProps} projectNavigationTree={projectNavigationTree} />
        </NavigationProvider>
      );

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated).toEqual({
        homeRef: 'htts://elastic.co',
        navigationTree: [
          {
            id: 'group1',
            title: 'Group 1',
            type: 'navGroup',
            path: ['group1'],
            children: [
              {
                id: 'item1',
                title: 'Item 1',
                path: ['group1', 'item1'],
              },
              {
                id: 'item2',
                path: ['group1', 'item2'],
                title: 'Title from deeplink!',
                deepLink: {
                  id: 'item2',
                  title: 'Title from deeplink!',
                  baseUrl: '',
                  url: '',
                  href: '',
                },
              },
              {
                id: 'item3',
                title: 'Deeplink title overriden',
                path: ['group1', 'item3'],
                deepLink: {
                  id: 'item2',
                  title: 'Title from deeplink!',
                  baseUrl: '',
                  url: '',
                  href: '',
                },
              },
            ],
          },
          ...defaultNavigationTree, // The default navigation tree is added at the end
        ],
      });
    });

    test.skip('does not render in the UI the nodes that points to unexisting deeplinks', async () => {
      // TODO: This test will be added when we'll have the UI and be able to add
      // data-test-subj to all the nodes with their paths
    });
  });
});
