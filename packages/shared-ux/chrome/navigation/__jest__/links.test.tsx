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
import { of } from 'rxjs';

import { Navigation } from '../src/ui/components/navigation';
import type { RootNavigationItemDefinition } from '../src/ui/types';
import { NavigationServices } from '../types';
import {
  getMockFn,
  renderNavigation,
  errorHandler,
  TestType,
  type ProjectNavigationChangeListener,
} from './utils';

describe('Links', () => {
  test('should filter out unknown deeplinks', async () => {
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();
    const unknownLinkId = 'unknown';

    const deepLinks$: NavigationServices['deepLinks$'] = of({
      item1: {
        id: 'item1',
        title: 'Title from deeplink',
        baseUrl: '',
        url: '',
        href: '',
      },
    });

    const runTests = async (type: TestType, { findByTestId, queryByTestId }: RenderResult) => {
      try {
        expect(await queryByTestId(new RegExp(`nav-item-root.group1.${unknownLinkId}`))).toBeNull();
        expect(await findByTestId(/nav-item-root.group1.item1/)).toBeVisible();
        expect(await findByTestId(/nav-item-root.group1.item1/)).toBeVisible();

        expect(onProjectNavigationChange).toHaveBeenCalled();
        const lastCall =
          onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
        const [{ navigationTree }] = lastCall;
        const [root] = navigationTree;
        expect(root.id).toBe('root');
        expect(root.children?.length).toBe(1);
        expect(root.children?.[0].children?.length).toBe(1);
        expect(root.children?.[0].children?.[0].id).toBe('item1');
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
          defaultIsCollapsed: false,
          children: [
            {
              id: 'group1',
              defaultIsCollapsed: false,
              children: [
                {
                  link: 'item1',
                },
                {
                  link: unknownLinkId,
                },
              ],
            },
          ],
        },
      ];

      const renderResult = renderNavigation({
        navTreeDef: { body: navigationBody },
        onProjectNavigationChange,
        services: { deepLinks$ },
      });

      await runTests('treeDef', renderResult);

      renderResult.unmount();
      onProjectNavigationChange.mockReset();
    }

    // -- With UI Components
    {
      const renderResult = renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="root" defaultIsCollapsed={false}>
              <Navigation.Group id="group1" defaultIsCollapsed={false}>
                <Navigation.Item<any> link="item1" />
                {/* Should be removed */}
                <Navigation.Item<any> link={unknownLinkId} title="Should NOT be there" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        ),
        onProjectNavigationChange,
        services: { deepLinks$ },
      });

      await runTests('uiComponents', renderResult);
    }
  });

  test('should allow href for absolute links', async () => {
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();

    const runTests = async (type: TestType, { debug }: RenderResult) => {
      try {
        expect(onProjectNavigationChange).toHaveBeenCalled();
        const lastCall =
          onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
        const [{ navigationTree }] = lastCall;

        const [root] = navigationTree;
        expect(root.children?.[0].href).toBe('https://example.com');
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
          defaultIsCollapsed: false,
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              href: 'https://example.com',
            },
          ],
        },
      ];

      const renderResult = renderNavigation({
        navTreeDef: { body: navigationBody },
        onProjectNavigationChange,
      });

      await runTests('treeDef', renderResult);

      renderResult.unmount();
      onProjectNavigationChange.mockReset();
    }

    // -- With UI Components
    {
      const renderResult = renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="root">
              <Navigation.Item id="item1" title="Item 1" href="https://example.com" />
            </Navigation.Group>
          </Navigation>
        ),
        onProjectNavigationChange,
      });

      await runTests('uiComponents', renderResult);
    }
  });

  test('should throw if href is not an absolute links', async () => {
    // We'll mock the console.error to avoid dumping the (expected) error in the console
    // source: https://github.com/jestjs/jest/pull/5267#issuecomment-356605468
    jest.spyOn(console, 'error');
    // @ts-expect-error we're mocking the console so "mockImplementation" exists
    // eslint-disable-next-line no-console
    console.error.mockImplementation(() => {});

    // -- Default navigation
    {
      const navigationBody: Array<RootNavigationItemDefinition<any>> = [
        {
          type: 'navGroup',
          id: 'root',
          defaultIsCollapsed: false,
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              href: '../dashboards',
            },
          ],
        },
      ];

      const expectToThrow = () => {
        renderNavigation({
          navTreeDef: { body: navigationBody },
        });
      };

      expect(expectToThrow).toThrowError('href must be an absolute URL. Node id [item1].');
    }

    // -- With UI Components
    {
      const expectToThrow = () => {
        renderNavigation({
          navigationElement: (
            <Navigation>
              <Navigation.Group id="root">
                <Navigation.Item id="item1" title="Item 1" href="../dashboards" />
              </Navigation.Group>
            </Navigation>
          ),
        });
      };

      expect(expectToThrow).toThrowError('href must be an absolute URL. Node id [item1].');
      // @ts-expect-error we're mocking the console so "mockImplementation" exists
      // eslint-disable-next-line no-console
      console.error.mockRestore();
    }
  });
});
