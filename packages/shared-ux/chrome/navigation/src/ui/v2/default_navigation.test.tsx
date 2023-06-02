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
import type { ProjectNavigationTreeDefinition, RootNavigationItemDefinition } from './types';
import { defaultNavigationTree } from './default_navigation.test.helpers';

const defaultProps = {
  homeRef: 'https://elastic.co',
};

describe('<DefaultNavigation />', () => {
  const services = getServicesMock();

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
            },
            {
              id: 'item2',
              title: 'Item 2',
            },
            {
              id: 'group1A',
              title: 'Group1A',
              children: [
                {
                  id: 'item1',
                  title: 'Group 1A Item 1',
                },
                {
                  id: 'group1A_1',
                  title: 'Group1A_1',
                  children: [
                    {
                      id: 'item1',
                      title: 'Group 1A_1 Item 1',
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
          <DefaultNavigation
            {...defaultProps}
            navigationTree={{
              body: navigationBody,
            }}
          />
        </NavigationProvider>
      );

      expect(await findByTestId('nav-item-group1.item1')).toBeVisible();
      expect(await findByTestId('nav-item-group1.item2')).toBeVisible();
      expect(await findByTestId('nav-item-group1.group1A')).toBeVisible();
      expect(await findByTestId('nav-item-group1.group1A.item1')).toBeVisible();
      expect(await findByTestId('nav-item-group1.group1A.group1A_1')).toBeVisible();

      // Click the last group to expand and show the last depth
      (await findByTestId('nav-item-group1.group1A.group1A_1')).click();

      expect(await findByTestId('nav-item-group1.group1A.group1A_1.item1')).toBeVisible();

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated).toEqual({
        homeRef: 'https://elastic.co',
        navigationTree: [
          {
            id: 'group1',
            path: ['group1'],
            title: '',
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
              {
                id: 'group1A',
                title: 'Group1A',
                path: ['group1', 'group1A'],
                children: [
                  {
                    id: 'item1',
                    title: 'Group 1A Item 1',
                    path: ['group1', 'group1A', 'item1'],
                  },
                  {
                    id: 'group1A_1',
                    title: 'Group1A_1',
                    path: ['group1', 'group1A', 'group1A_1'],
                    children: [
                      {
                        id: 'item1',
                        title: 'Group 1A_1 Item 1',
                        path: ['group1', 'group1A', 'group1A_1', 'item1'],
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

    test('should read the title from deeplink', async () => {
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

      const navigationBody: RootNavigationItemDefinition[] = [
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
        homeRef: 'https://elastic.co',
        navigationTree: [
          {
            id: 'root',
            path: ['root'],
            title: '',
            children: [
              {
                id: 'group1',
                path: ['root', 'group1'],
                title: '',
                children: [
                  {
                    id: 'item1',
                    path: ['root', 'group1', 'item1'],
                    title: 'Title from deeplink',
                    deepLink: {
                      id: 'item1',
                      title: 'Title from deeplink',
                      baseUrl: '',
                      url: '',
                      href: '',
                    },
                  },
                  {
                    id: 'item2',
                    title: 'Overwrite deeplink title',
                    path: ['root', 'group1', 'item2'],
                    deepLink: {
                      id: 'item1',
                      title: 'Title from deeplink',
                      baseUrl: '',
                      url: '',
                      href: '',
                    },
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    test('should render cloud link', async () => {
      const navigationBody: RootNavigationItemDefinition[] = [
        {
          type: 'cloudLink',
          preset: 'deployments',
        },
        {
          type: 'cloudLink',
          preset: 'projects',
        },
        {
          type: 'cloudLink',
          href: 'https://foo.com',
          icon: 'myIcon',
          title: 'Custom link',
        },
      ];

      const { findByTestId } = render(
        <NavigationProvider {...services}>
          <DefaultNavigation
            {...defaultProps}
            navigationTree={{
              body: navigationBody,
            }}
          />
        </NavigationProvider>
      );

      expect(await findByTestId('nav-header-link-to-projects')).toBeVisible();
      expect(await findByTestId('nav-header-link-to-deployments')).toBeVisible();
      expect(await findByTestId('nav-header-link-to-cloud')).toBeVisible();
      expect(await (await findByTestId('nav-header-link-to-cloud')).textContent).toBe(
        'Custom link'
      );
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
          <DefaultNavigation
            {...defaultProps}
            navigationTree={{
              body: navigationBody,
            }}
          />
        </NavigationProvider>
      );

      expect(await findByTestId('nav-bucket-recentlyAccessed')).toBeVisible();
      expect(await (await findByTestId('nav-bucket-recentlyAccessed')).textContent).toBe(
        'RecentThis is an exampleAnother example'
      );
    });
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
        homeRef: 'https://elastic.co',
        navigationTree: [
          {
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
          // The default navigation tree is added at the end
          ...defaultNavigationTree.map(({ type, ...rest }) => rest),
        ],
      });
    });
  });
});
