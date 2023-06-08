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
import type { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { getServicesMock } from '../../../mocks/src/jest';
import { NavigationProvider } from '../../services';
import { DefaultNavigation } from './default_navigation';

describe('<DefaultNavigation />', () => {
  const services = getServicesMock();

  describe('builds the navigation tree', () => {
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

      const navTreeConfig: ChromeProjectNavigationNode[] = [
        {
          id: 'item1',
          title: 'Item 1',
        },
        {
          id: 'item2-a',
          link: 'item2', // Title from deeplink
        },
        {
          id: 'item2-b',
          link: 'item2',
          title: 'Override the deeplink with props',
        },
        {
          link: 'disabled',
          title: 'Should NOT be there',
        },
      ];

      render(
        <NavigationProvider
          {...services}
          navLinks$={navLinks$}
          onProjectNavigationChange={onProjectNavigationChange}
        >
          <DefaultNavigation navTree={navTreeConfig} />
        </NavigationProvider>
      );

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated).toEqual({
        navigationTree: [
          {
            id: 'item1',
            title: 'Item 1',
          },
          {
            id: 'item2-a',
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
            id: 'item2-b',
            title: 'Override the deeplink with props',
            deepLink: {
              id: 'item2',
              title: 'Title from deeplink!',
              baseUrl: '',
              url: '',
              href: '',
            },
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

      const navTreeConfig: ChromeProjectNavigationNode[] = [
        {
          id: 'item1',
          title: 'Item 1',
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              children: [
                {
                  link: 'item2', // Title from deeplink
                  children: [
                    {
                      id: 'item1',
                      title: 'Item 1',
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
          <DefaultNavigation navTree={navTreeConfig} />
        </NavigationProvider>
      );

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated).toEqual({
        navigationTree: [
          {
            id: 'item1',
            title: 'Item 1',
            children: [
              {
                id: 'item1',
                title: 'Item 1',
                children: [
                  {
                    id: 'item2',
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
                        title: 'Item 1',
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

    test.skip('does not render in the UI the nodes that points to unexisting deeplinks', async () => {
      // TODO: This test will be added when we'll have the UI and be able to add
      // data-test-subj to all the nodes with their paths
    });
  });
});
