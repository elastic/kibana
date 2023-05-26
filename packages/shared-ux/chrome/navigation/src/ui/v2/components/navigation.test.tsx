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

import { getServicesMock } from '../../../../mocks/src/jest';
import { NavigationProvider } from '../../../services';
import { Navigation } from './navigation';

describe('<Navigation />', () => {
  const services = getServicesMock();

  describe('builds the navigation tree', () => {
    test('should read the title from props, children or deeplink', async () => {
      const navLinks$: Observable<ChromeNavLink[]> = of([
        {
          id: 'item3',
          title: 'Title from deeplink!',
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
          <Navigation homeRef="https://elastic.co">
            <Navigation.Item id="item1">Title in children</Navigation.Item>
            <Navigation.Item id="item2" title="Title in props" />
            {/* Title will be read from the deeplink */}
            <Navigation.Item id="item3-a" link="item3" />
            {/* Title will be read from the props */}
            <Navigation.Item id="item3-b" link="item3" title="Override the deeplink with props" />
            {/* Title will be read from the children */}
            <Navigation.Item id="item3-c" link="item3">
              Override the deeplink with children
            </Navigation.Item>
            {/* Should not appear */}
            <Navigation.Item link="disabled" title="Should NOT be there" />
          </Navigation>
        </NavigationProvider>
      );

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTree] = lastCall;

      expect(navTree).toEqual({
        homeRef: 'https://elastic.co',
        navigationTree: [
          {
            id: 'item1',
            path: ['item1'],
            title: '',
          },
          {
            id: 'item2',
            title: 'Title in props',
            path: ['item2'],
          },
          {
            id: 'item3-a',
            path: ['item3-a'],
            title: 'Title from deeplink!',
            deepLink: {
              id: 'item3',
              title: 'Title from deeplink!',
              baseUrl: '',
              url: '',
              href: '',
            },
          },
          {
            id: 'item3-b',
            title: 'Override the deeplink with props',
            path: ['item3-b'],
            deepLink: {
              id: 'item3',
              title: 'Title from deeplink!',
              baseUrl: '',
              url: '',
              href: '',
            },
          },
          {
            id: 'item3-c',
            path: ['item3-c'],
            title: 'Title from deeplink!',
            deepLink: {
              id: 'item3',
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
          id: 'group1A_1',
          title: 'Title from deeplink!',
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
          <Navigation homeRef="https://elastic.co">
            <Navigation.Group id="group1" title="Group 1">
              <Navigation.Group id="group1A" title="Group 1A">
                {/* Will read the title from the deeplink */}
                <Navigation.Group link="group1A_1">
                  <Navigation.Item id="item1" title="Item 1" />
                </Navigation.Group>
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTree] = lastCall;

      expect(navTree).toEqual({
        homeRef: 'https://elastic.co',
        navigationTree: [
          {
            id: 'group1',
            title: 'Group 1',
            path: ['group1'],
            children: [
              {
                id: 'group1A',
                title: 'Group 1A',
                path: ['group1', 'group1A'],
                children: [
                  {
                    id: 'group1A_1',
                    path: ['group1', 'group1A', 'group1A_1'],
                    title: 'Title from deeplink!',
                    deepLink: {
                      id: 'group1A_1',
                      title: 'Title from deeplink!',
                      baseUrl: '',
                      url: '',
                      href: '',
                    },
                    children: [
                      {
                        id: 'item1',
                        title: 'Item 1',
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

    test.skip('does not render in the UI the nodes that points to unexisting deeplinks', async () => {
      // TODO: This test will be added when we'll have the UI and be able to add
      // data-test-subj to all the nodes with their paths
    });
  });
});
