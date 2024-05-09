/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './setup_jest_mocks';
import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import type {
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';

import { PanelContentProvider } from '../src/ui';
import { renderNavigation } from './utils';

describe('Panel', () => {
  test('should render group as panel opener', async () => {
    const navigationTree: NavigationTreeDefinitionUI = {
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

    expect(await findByTestId(/panelOpener-root.group1/)).toBeVisible();
    expect(queryByTestId(/sideNavPanel/)).toBeNull();
    (await findByTestId(/panelOpener-root.group1/)).click(); // open the panel
    expect(queryByTestId(/sideNavPanel/)).toBeVisible();
  });

  test('should not render group if all children are hidden', async () => {
    const navigationTree: NavigationTreeDefinitionUI = {
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

    expect(queryByTestId(/panelOpener-root.group1/)).toBeNull();
    expect(queryByTestId(/panelOpener-root.group2/)).toBeVisible();
  });

  describe('custom content', () => {
    test('should render custom component inside the panel', async () => {
      const panelContentProvider: PanelContentProvider = (id) => {
        return {
          content: ({ closePanel, selectedNode, activeNodes }) => {
            const [path0 = []] = activeNodes;
            return (
              <div data-test-subj="customPanelContent">
                <p data-test-subj="customPanelSelectedNode">{selectedNode.path}</p>
                <ul data-test-subj="customPanelActiveNodes">
                  {path0.map((node) => (
                    <li key={node.id}>{node.id}</li>
                  ))}
                </ul>
                <button data-test-subj="customPanelCloseBtn" onClick={closePanel}>
                  Close panel
                </button>
              </div>
            );
          },
        };
      };

      const activeNodes$ = new BehaviorSubject<ChromeProjectNavigationNode[][]>([
        [
          {
            id: 'activeGroup1',
            title: 'Group 1',
            path: 'activeGroup1',
          },
          {
            id: 'activeItem1',
            title: 'Item 1',
            path: 'activeGroup1.activeItem1',
          },
        ],
      ]);

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
                href: '/app/item1',
                renderAs: 'panelOpener',
                children: [
                  { id: 'item1', title: 'Item 1', href: '/app/item1', path: 'root.group1.item1' },
                ],
              },
            ],
          },
        ],
      };

      const { queryByTestId } = renderNavigation({
        navTreeDef: of(navTree),
        panelContentProvider,
        services: { activeNodes$ },
      });

      expect(queryByTestId(/sideNavPanel/)).toBeNull();
      expect(queryByTestId(/customPanelContent/)).toBeNull();

      queryByTestId(/panelOpener-root.group1/)?.click(); // open the panel

      expect(queryByTestId(/sideNavPanel/)).not.toBeNull();
      expect(queryByTestId(/customPanelContent/)).not.toBeNull();
      expect(queryByTestId(/customPanelContent/)).toBeVisible();
      // Test that the selected node is correclty passed
      expect(queryByTestId(/customPanelSelectedNode/)?.textContent).toBe('root.group1');
      // Test that the active nodes are correclty passed
      expect(queryByTestId(/customPanelActiveNodes/)?.textContent).toBe('activeGroup1activeItem1');
      // Test that handler to close the panel is correctly passed
      queryByTestId(/customPanelCloseBtn/)?.click(); // close the panel
      expect(queryByTestId(/customPanelContent/)).toBeNull();
      expect(queryByTestId(/sideNavPanel/)).toBeNull();
    });
  });

  describe('auto generated content', () => {
    test('should rendre block groups with title', async () => {
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

      queryByTestId(/panelOpener-root.group1/)?.click(); // open the panel

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

      queryByTestId(/panelOpener-root.group1/)?.click(); // open the panel

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

      queryByTestId(/panelOpener-root.group1/)?.click(); // open the panel

      expect(queryByTestId(/panelGroupId-foo/)).toBeVisible();

      const panelNavItems = queryAllByTestId(/panelNavItem/);
      expect(panelNavItems.length).toBe(2); // "item2" has been filtered out as it is hidden

      expect(queryByTestId(/panelNavItem-id-item1/)).not.toBeVisible(); // Accordion is collapsed
      expect(queryByTestId(/panelNavItem-id-item3/)).not.toBeVisible(); // Accordion is collapsed

      queryByTestId(/panelAccordionBtnId-foo/)?.click(); // Expand accordion

      expect(queryByTestId(/panelNavItem-id-item1/)).toBeVisible();
      expect(queryByTestId(/panelNavItem-id-item3/)).toBeVisible();
    });
  });
});
