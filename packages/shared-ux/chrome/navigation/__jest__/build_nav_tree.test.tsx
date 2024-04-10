/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './setup_jest_mocks';
import { of } from 'rxjs';
import type { NavigationTreeDefinitionUI } from '@kbn/core-chrome-browser';

import { renderNavigation } from './utils';

describe('builds navigation tree', () => {
  test('render reference UI and build the navigation tree', async () => {
    const { findByTestId } = renderNavigation({
      navTreeDef: of({
        body: [
          {
            id: 'group1',
            title: 'Group 1',
            defaultIsCollapsed: false,
            path: 'group1',
            children: [
              {
                id: 'item1',
                title: 'Item 1',
                href: 'https://foo',
                path: 'group1.item1',
              },
              {
                id: 'item2',
                title: 'Item 2',
                href: 'https://foo',
                path: 'group1.item2',
              },
              {
                id: 'group1A',
                title: 'Group1A',
                defaultIsCollapsed: false,
                path: 'group1.group1A',
                children: [
                  {
                    id: 'item1',
                    title: 'Group 1A Item 1',
                    href: 'https://foo',
                    path: 'group1.group1A.item1',
                  },
                  {
                    id: 'group1A_1',
                    title: 'Group1A_1',
                    path: 'group1.group1A.group1A_1',
                    children: [
                      {
                        id: 'item1',
                        title: 'Group 1A_1 Item 1',
                        href: 'https://foo',
                        path: 'group1.group1A.group1A_1.item1',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    expect(await findByTestId(/nav-item-group1.item1\s/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.item2\s/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.group1A\s/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.group1A.item1\s/)).toBeVisible();
    expect(await findByTestId(/nav-item-group1.group1A.group1A_1\s/)).toBeVisible();

    // Click the last group to expand and show the last depth
    (await findByTestId(/nav-item-group1.group1A.group1A_1\s/)).click();

    expect(await findByTestId(/nav-item-group1.group1A.group1A_1.item1/)).toBeVisible();
  });

  test('should not render the group if it does not have children', async () => {
    const navTree: NavigationTreeDefinitionUI = {
      body: [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
          isCollapsible: false,
          children: [
            {
              id: 'group1',
              title: 'Group 1',
              path: 'root.group1',
              children: [], // Group with no children should not be rendered
            },
            {
              id: 'group2',
              title: 'Group 2',
              path: 'group2',
              isCollapsible: false,
              children: [
                {
                  id: 'item1',
                  title: 'Item 1',
                  href: '/app/item1',
                  path: 'root.group2.item1',
                },
              ],
            },
          ],
        },
      ],
    };

    const { queryByTestId } = renderNavigation({
      navTreeDef: of(navTree),
    });

    // Check the DOM
    expect(queryByTestId(/nav-group-root.group1/)).toBeNull();
    expect(queryByTestId(/nav-item-root.group2.item1/)).toBeVisible();
  });

  test('should render recently accessed items', async () => {
    const recentlyAccessed$ = of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]);

    const navTree: NavigationTreeDefinitionUI = {
      body: [
        {
          type: 'recentlyAccessed',
        },
      ],
    };

    const { findByTestId } = renderNavigation({
      navTreeDef: of(navTree),
      services: { recentlyAccessed$ },
    });

    expect(await findByTestId('nav-bucket-recentlyAccessed')).toBeVisible();
    expect((await findByTestId('nav-bucket-recentlyAccessed')).textContent).toBe(
      'RecentThis is an exampleAnother example'
    );
  });
});
