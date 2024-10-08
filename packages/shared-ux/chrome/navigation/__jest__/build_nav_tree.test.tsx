/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './setup_jest_mocks';
import { of } from 'rxjs';
import type {
  NavigationTreeDefinitionUI,
  ChromeProjectNavigationNode,
} from '@kbn/core-chrome-browser';

import { EventTracker } from '../src/analytics';
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

  test('should handle links on accordion toggle button', async () => {
    const navigateToUrl = jest.fn();

    const accordionNode: ChromeProjectNavigationNode = {
      id: 'group1',
      title: 'Group 1',
      path: 'group1',
      renderAs: 'accordion',
      href: '/app/foo', // Accordion has an href
      children: [
        {
          id: 'item1',
          title: 'Item 1',
          href: 'https://foo',
          path: 'group1.item1',
        },
      ],
    };

    {
      const { findByTestId, unmount } = renderNavigation({
        navTreeDef: of({
          body: [accordionNode],
        }),
        services: { navigateToUrl },
      });

      const accordionToggleButton = await findByTestId(/nav-item-group1\s/);
      accordionToggleButton.click();
      expect(navigateToUrl).not.toHaveBeenCalled();
      unmount();
    }

    {
      const { findByTestId } = renderNavigation({
        navTreeDef: of({
          body: [
            {
              ...accordionNode,
              isCollapsible: false, // Non-collapsible accordion
            },
          ],
        }),
        services: { navigateToUrl },
      });

      const accordionToggleButton = await findByTestId(/nav-item-group1\s/);
      accordionToggleButton.click();

      expect(navigateToUrl).toHaveBeenCalledWith('/app/foo'); // Should navigate to the href
    }
  });

  test('should track click event', async () => {
    const navigateToUrl = jest.fn();
    const reportEvent = jest.fn();

    const node: ChromeProjectNavigationNode = {
      id: 'group1',
      title: 'Group 1',
      path: 'group1',
      defaultIsCollapsed: false,
      children: [
        {
          id: 'item1',
          title: 'Item 1',
          href: 'https://foo',
          path: 'group1.item1',
        },
      ],
    };

    const { findByTestId } = renderNavigation({
      navTreeDef: of({
        body: [node],
      }),
      services: { navigateToUrl, eventTracker: new EventTracker({ reportEvent }) },
    });

    const navItem = await findByTestId(/nav-item-group1.item1\s/);
    navItem.click();

    expect(navigateToUrl).toHaveBeenCalled();
    expect(reportEvent).toHaveBeenCalledWith('solutionNav_click_navlink', {
      href: undefined,
      href_prev: undefined,
      id: 'item1',
    });
  });

  test('should allow custom onClick handler for links', async () => {
    const navigateToUrl = jest.fn();
    const onClick = jest.fn();

    const node: ChromeProjectNavigationNode = {
      id: 'group1',
      title: 'Group 1',
      path: 'group1',
      defaultIsCollapsed: false,
      children: [
        {
          id: 'item1',
          title: 'Item 1',
          href: 'https://foo',
          path: 'group1.item1',
          onClick,
        },
      ],
    };

    const { findByTestId } = renderNavigation({
      navTreeDef: of({
        body: [node],
      }),
      services: { navigateToUrl },
    });

    const navItem = await findByTestId(/nav-item-group1.item1\s/);
    navItem.click();

    expect(navigateToUrl).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }));
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
      body: [{ type: 'recentlyAccessed' }],
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

  test('should limit the number of recently accessed items to 5', async () => {
    const recentlyAccessed$ = of([
      { label: 'Item1', link: '/app/foo/1', id: '1' },
      { label: 'Item2', link: '/app/foo/2', id: '2' },
      { label: 'Item3', link: '/app/foo/3', id: '3' },
      { label: 'Item4', link: '/app/foo/4', id: '4' },
      { label: 'Item5', link: '/app/foo/5', id: '5' },
      { label: 'Item6', link: '/app/foo/6', id: '6' },
      { label: 'Item7', link: '/app/foo/7', id: '7' },
    ]);

    const navTree: NavigationTreeDefinitionUI = {
      body: [{ type: 'recentlyAccessed' }],
    };

    const { queryAllByTestId } = renderNavigation({
      navTreeDef: of(navTree),
      services: { recentlyAccessed$ },
    });

    const items = await queryAllByTestId(/nav-recentlyAccessed-item/);
    expect(items).toHaveLength(5);
    const itemsText = items.map((item) => item.textContent);
    expect(itemsText).toEqual(['Item1', 'Item2', 'Item3', 'Item4', 'Item5']);
  });
});
