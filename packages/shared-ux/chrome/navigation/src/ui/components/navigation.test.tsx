/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ChromeNavLink } from '@kbn/core-chrome-browser';
import { render } from '@testing-library/react';
import React from 'react';
import { of, type Observable } from 'rxjs';
import {
  defaultAnalyticsNavGroup,
  defaultDevtoolsNavGroup,
  defaultManagementNavGroup,
  defaultMlNavGroup,
} from '../../../mocks/src/default_navigation.test.helpers';
import { getServicesMock } from '../../../mocks/src/jest';
import { NavigationProvider } from '../../services';
import { Navigation } from './navigation';

describe('<Navigation />', () => {
  const services = getServicesMock();

  describe('builds the navigation tree', () => {
    test('render reference UI and build the navigation tree', async () => {
      const onProjectNavigationChange = jest.fn();

      const { findByTestId } = render(
        <NavigationProvider {...services} onProjectNavigationChange={onProjectNavigationChange}>
          <Navigation>
            <Navigation.Group id="group1">
              <Navigation.Item id="item1" title="Item 1" />
              <Navigation.Item id="item2" title="Item 2" />
              <Navigation.Group id="group1A" title="Group1A">
                <Navigation.Item id="item1" title="Group 1A Item 1" />
                <Navigation.Group id="group1A_1" title="Group1A_1">
                  <Navigation.Item id="item1" title="Group 1A_1 Item 1" />
                </Navigation.Group>
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
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
      const [navTree] = lastCall;

      expect(navTree).toEqual({
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
                <Navigation.Item id="item1" link="item1" />
                <Navigation.Item id="item2" link="item1" title="Overwrite deeplink title" />
                <Navigation.Item id="item3" title="Title in props" />
                <Navigation.Item id="item4">Title in children</Navigation.Item>
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
                  {
                    id: 'item3',
                    title: 'Title in props',
                    path: ['root', 'group1', 'item3'],
                  },
                  {
                    id: 'item4',
                    path: ['root', 'group1', 'item4'],
                    title: 'Title in children',
                  },
                ],
              },
            ],
          },
        ],
      });
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
            <Navigation.Group id="root">
              <Navigation.Group id="group1">
                {/* Title from deeplink */}
                <Navigation.Item id="item1" link="item1" />
                {/* Should not appear */}
                <Navigation.Item id="unknownLink" link="unknown" title="Should NOT be there" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      expect(await findByTestId('nav-item-root.group1.item1')).toBeVisible();
      expect(await findByTestId('nav-item-root.group1.item1')).toBeVisible();

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTree] = lastCall;

      expect(navTree).toEqual({
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
                ],
              },
            ],
          },
        ],
      });
    });

    test('should render custom react element', async () => {
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
            <Navigation.Group id="root">
              <Navigation.Group id="group1">
                <Navigation.Item link="item1">
                  <div data-test-subj="my-custom-element">Custom element</div>
                </Navigation.Item>
                <Navigation.Item id="item2" title="Children prop">
                  {(navNode) => <div data-test-subj="my-other-custom-element">{navNode.title}</div>}
                </Navigation.Item>
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        </NavigationProvider>
      );

      expect(await findByTestId('my-custom-element')).toBeVisible();
      expect(await findByTestId('my-other-custom-element')).toBeVisible();
      expect((await findByTestId('my-other-custom-element')).textContent).toBe('Children prop');

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTree] = lastCall;

      expect(navTree).toEqual({
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
                    renderItem: expect.any(Function),
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
                    path: ['root', 'group1', 'item2'],
                    title: 'Children prop',
                    renderItem: expect.any(Function),
                  },
                ],
              },
            ],
          },
        ],
      });
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

      expect(onProjectNavigationChange).toHaveBeenCalled();
      const lastCall =
        onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
      const [navTreeGenerated] = lastCall;

      expect(navTreeGenerated).toEqual({
        navigationTree: expect.any(Array),
      });

      // The default navigation tree for analytics
      expect(navTreeGenerated.navigationTree[0]).toEqual(defaultAnalyticsNavGroup);

      // The default navigation tree for ml
      expect(navTreeGenerated.navigationTree[1]).toEqual(defaultMlNavGroup);

      // The default navigation tree for devtools+
      expect(navTreeGenerated.navigationTree[2]).toEqual(defaultDevtoolsNavGroup);

      // The default navigation tree for management
      expect(navTreeGenerated.navigationTree[3]).toEqual(defaultManagementNavGroup);
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

      expect(await findByTestId('nav-bucket-recentlyAccessed')).toBeVisible();
      expect((await findByTestId('nav-bucket-recentlyAccessed')).textContent).toBe(
        'RecentThis is an exampleAnother example'
      );
    });
  });
});
