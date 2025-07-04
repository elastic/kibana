/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './setup_jest_mocks';

import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { of } from 'rxjs';

import type { NavigationTreeDefinitionUI } from '@kbn/core-chrome-browser';

import { renderNavigation } from './utils';
import { act } from '@testing-library/react';

describe('Panel', () => {
  test('should render group as panel opener', async () => {
    const navigationTree: NavigationTreeDefinitionUI = {
      id: 'es',
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
              href: '/app/item1',
              path: 'root.group1',
              renderAs: 'panelOpener',
              children: [
                {
                  id: 'item1',
                  title: 'Item 1',
                  href: '/app/item1',
                  path: 'root.group1.item1',
                },
              ],
            },
          ],
        },
      ],
    };

    const { findByTestId, queryByTestId } = renderNavigation({
      navTreeDef: of(navigationTree),
    });

    expect(await findByTestId(/nav-item-root.group1/)).toBeVisible();
    expect(queryByTestId(/sideNavPanel/)).toBeNull();
    await act(async () => {
      (await findByTestId(/nav-item-root.group1/)).click(); // open the panel
    });

    expect(queryByTestId(/sideNavPanel/)).toBeVisible();
  });

  test('should not render group if all children are hidden', async () => {
    const navigationTree: NavigationTreeDefinitionUI = {
      id: 'es',
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
              href: '/app/item1',
              renderAs: 'block',
              children: [
                // All children are hidden, this group should not render
                {
                  id: 'item1',
                  title: 'Item 1',
                  href: '/app/item1',
                  path: 'root.group1.item1',
                  sideNavStatus: 'hidden',
                },
              ],
            },
            {
              id: 'group2',
              title: 'Group 2',
              path: 'root.group2',
              href: '/app/group2',
              renderAs: 'panelOpener',
              children: [
                // sideNavStatus is "visible" by default
                { id: 'item1', title: 'Item 1', href: '/app/item1', path: 'root.group2.item1' },
              ],
            },
          ],
        },
      ],
    };

    const { queryByTestId } = renderNavigation({
      navTreeDef: of(navigationTree),
    });

    expect(queryByTestId(/nav-item-root.group1.item1/)).toBeNull();
    expect(queryByTestId(/nav-item-root.group2/)).toBeVisible();
  });

  describe('toggle the panel open and closed', () => {
    let navigationTree: NavigationTreeDefinitionUI;
    beforeAll(() => {
      navigationTree = {
        id: 'es',
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
                renderAs: 'panelOpener',
                children: [
                  { id: 'item1', title: 'Item 1', href: '/app/item1', path: 'root.group1.item1' },
                ],
              },
            ],
          },
        ],
      };
    });

    test('should allow button to toggle', async () => {
      const { findByTestId, queryByTestId } = renderNavigation({
        navTreeDef: of(navigationTree),
      });

      // open the panel
      await act(async () => {
        (await findByTestId(/nav-item-id-group1/)).click();
      });
      expect(queryByTestId(/sideNavPanel/)).toBeVisible();

      // close the panel
      await userEvent.click(await findByTestId(/nav-item-id-group1/));
      expect(queryByTestId(/sideNavPanel/)).toBeNull();
    });

    test('should allow the button label to toggle', async () => {
      const { findByTestId, queryByTestId, container } = renderNavigation({
        navTreeDef: of(navigationTree),
      });

      // open the panel via the button
      await act(async () => {
        (await findByTestId(/nav-item-id-group1/)).click();
      });
      expect(queryByTestId(/sideNavPanel/)).toBeVisible();

      // click the label element
      const buttonLabel = container.querySelectorAll('span span')[0];
      expect(buttonLabel).toBeInTheDocument();
      await userEvent.click(buttonLabel!);

      expect(queryByTestId(/sideNavPanel/)).toBeNull();
    });

    test('should allow the button icon to toggle', async () => {
      const { findByTestId, queryByTestId, container } = renderNavigation({
        navTreeDef: of(navigationTree),
      });

      // open the panel via the button
      await act(async () => {
        (await findByTestId(/nav-item-id-group1/)).click();
      });
      expect(queryByTestId(/sideNavPanel/)).toBeVisible();

      // click the label element
      const buttonIcon = container.querySelectorAll('span span')[1];
      expect(buttonIcon).toBeInTheDocument();
      await userEvent.click(buttonIcon!);

      expect(queryByTestId(/sideNavPanel/)).toBeNull();
    });

    test('should allow outside click to close the panel', async () => {
      const { findByTestId, queryByTestId } = renderNavigation({
        navTreeDef: of(navigationTree),
      });

      // open the panel via the button
      await act(async () => {
        (await findByTestId(/nav-item-id-group1/)).click();
      });
      expect(queryByTestId(/sideNavPanel/)).toBeVisible();

      // click an element outside of the panel
      const navRoot = await findByTestId(/nav-item-id-root/);
      expect(navRoot).toBeInTheDocument();

      const navRootParent = navRoot!.parentNode! as Element;
      expect(navRootParent).toBeInTheDocument();
      await userEvent.click(navRootParent);

      expect(queryByTestId(/sideNavPanel/)).toBeNull();
    });
  });

  describe('auto generated content', () => {
    test('should rendre block groups with title', async () => {
      const navTree: NavigationTreeDefinitionUI = {
        id: 'es',
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
                href: '/app/item1',
                renderAs: 'panelOpener',
                children: [
                  {
                    id: 'foo',
                    title: 'Foo',
                    path: 'root.group1.foo',
                    children: [
                      {
                        id: 'item1',
                        href: '/app/item1',
                        path: 'root.group2.foo.item1',
                        title: 'Item 1',
                      },
                      {
                        id: 'item2',
                        href: '/app/item2',
                        path: 'root.group2.foo.item2',
                        title: 'Item 2',
                        sideNavStatus: 'hidden',
                      },
                      {
                        id: 'item3',
                        href: '/app/item3',
                        path: 'root.group2.foo.item3',
                        title: 'Item 3',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const { queryByTestId, queryAllByTestId } = renderNavigation({
        navTreeDef: of(navTree),
      });

      act(() => {
        queryByTestId(/nav-item-root.group1/)?.click(); // open the panel
      });

      expect(queryByTestId(/panelGroupId-foo/)).toBeVisible();
      expect(queryByTestId(/panelGroupTitleId-foo/)?.textContent).toBe('Foo');

      const panelNavItems = queryAllByTestId(/panelNavItem/);
      expect(panelNavItems.length).toBe(2); // "item2" has been filtered out as it is hidden
      expect(panelNavItems.map(({ textContent }) => textContent?.trim())).toEqual([
        'Item 1',
        'Item 3',
      ]);
    });

    test('should rendre block groups without title', async () => {
      const navTree: NavigationTreeDefinitionUI = {
        id: 'es',
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
                href: '/app/item1',
                renderAs: 'panelOpener',
                children: [
                  {
                    id: 'foo',
                    title: '', // Empty title are not rendered
                    path: 'root.group1.foo',
                    children: [
                      {
                        id: 'item1',
                        href: '/app/item1',
                        path: 'root.group2.foo.item1',
                        title: 'Item 1',
                      },
                      {
                        id: 'item2',
                        href: '/app/item2',
                        path: 'root.group2.foo.item2',
                        title: 'Item 2',
                        sideNavStatus: 'hidden',
                      },
                      {
                        id: 'item3',
                        href: '/app/item3',
                        path: 'root.group2.foo.item3',
                        title: 'Item 3',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const { queryByTestId, queryAllByTestId } = renderNavigation({
        navTreeDef: of(navTree),
      });

      act(() => {
        queryByTestId(/nav-item-root.group1/)?.click(); // open the panel
      });

      expect(queryByTestId(/panelGroupTitleId-foo/)).toBeNull(); // No title rendered

      const panelNavItems = queryAllByTestId(/panelNavItem/);
      expect(panelNavItems.length).toBe(2); // "item2" has been filtered out as it is hidden
      expect(panelNavItems.map(({ textContent }) => textContent?.trim())).toEqual([
        'Item 1',
        'Item 3',
      ]);
    });

    test('should rendre accordion groups', async () => {
      const navTree: NavigationTreeDefinitionUI = {
        id: 'es',
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
                href: '/app/item1',
                renderAs: 'panelOpener',
                children: [
                  {
                    id: 'foo',
                    title: 'Foo',
                    path: 'root.group1.foo',
                    renderAs: 'accordion',
                    children: [
                      {
                        id: 'item1',
                        href: '/app/item1',
                        path: 'root.group2.foo.item1',
                        title: 'Item 1',
                      },
                      {
                        id: 'item2',
                        href: '/app/item2',
                        path: 'root.group2.foo.item2',
                        title: 'Item 2',
                        sideNavStatus: 'hidden',
                      },
                      {
                        id: 'item3',
                        href: '/app/item3',
                        path: 'root.group2.foo.item3',
                        title: 'Item 3',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const { queryByTestId, queryAllByTestId } = renderNavigation({
        navTreeDef: of(navTree),
      });

      act(() => {
        queryByTestId(/nav-item-root.group1/)?.click(); // open the panel
      });

      expect(queryByTestId(/panelGroupId-foo/)).toBeVisible();

      const panelNavItems = queryAllByTestId(/panelNavItem/);
      expect(panelNavItems.length).toBe(2); // "item2" has been filtered out as it is hidden

      expect(queryByTestId(/panelNavItem-id-item1/)).not.toBeVisible(); // Accordion is collapsed
      expect(queryByTestId(/panelNavItem-id-item3/)).not.toBeVisible(); // Accordion is collapsed

      act(() => {
        queryByTestId(/panelAccordionBtnId-foo/)?.click(); // Expand accordion
      });

      expect(queryByTestId(/panelNavItem-id-item1/)).toBeVisible();
      expect(queryByTestId(/panelNavItem-id-item3/)).toBeVisible();
    });

    test('allows panel to contain a mix of ungrouped items and grouped items', () => {
      const navTree: NavigationTreeDefinitionUI = {
        id: 'es',
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
                href: '/app/item1',
                renderAs: 'panelOpener',
                children: [
                  {
                    id: 'item0',
                    title: 'Item 0',
                    href: '/app/item0',
                    path: 'root.group1.foo.item0',
                  },
                  {
                    id: 'foo',
                    title: 'Group 1',
                    path: 'root.group1.foo',
                    children: [
                      {
                        id: 'item1',
                        href: '/app/item1',
                        path: 'root.group1.foo.item1',
                        title: 'Item 1',
                      },
                      {
                        id: 'item2',
                        href: '/app/item2',
                        path: 'root.group1.foo.item2',
                        title: 'Item 2',
                      },
                    ],
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

      act(() => {
        queryByTestId(/nav-item-root.group1/)?.click(); // open the panel
      });

      expect(queryByTestId(/sideNavPanelError/)).toHaveTextContent(
        'Side navigation parsing error[Chrome navigation] Error in node [group1]. Children must either all be "groups" or all "items" but not a mix of both.'
      );
    });

    test('allows panel items to use custom rendering', () => {
      const componentSpy = jest.fn();

      const Custom: React.FC = () => {
        componentSpy();
        return <>Hello</>;
      };

      const navTree: NavigationTreeDefinitionUI = {
        id: 'es',
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
                href: '/app/item1',
                renderAs: 'panelOpener',
                children: [
                  {
                    id: 'foo',
                    title: 'Group 1',
                    path: 'root.group1.foo',
                    children: [
                      {
                        id: 'item1',
                        title: 'Item 1',
                        path: 'root.group1.foo.item1',
                        renderItem: () => {
                          return <Custom />;
                        },
                      },
                    ],
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

      expect(componentSpy).not.toHaveBeenCalled();

      act(() => {
        queryByTestId(/nav-item-root.group1/)?.click(); // open the panel
      });

      expect(componentSpy).toHaveBeenCalled();
    });
  });
});
