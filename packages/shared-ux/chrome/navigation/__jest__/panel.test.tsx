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
import { BehaviorSubject } from 'rxjs';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { Navigation } from '../src/ui/components/navigation';
import type { RootNavigationItemDefinition } from '../src/ui/types';
import { PanelContentProvider } from '../src/ui';
import {
  renderNavigation,
  errorHandler,
  TestType,
  getMockFn,
  ProjectNavigationChangeListener,
} from './utils';

describe('Panel', () => {
  test('should render group as panel opener', async () => {
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();

    const runTests = async (type: TestType, { findByTestId, queryByTestId }: RenderResult) => {
      try {
        expect(await findByTestId(/panelOpener-root.group1/)).toBeVisible();
        expect(queryByTestId(/sideNavPanel/)).toBeNull();
        (await findByTestId(/panelOpener-root.group1/)).click(); // open the panel
        expect(queryByTestId(/sideNavPanel/)).toBeVisible();

        expect(onProjectNavigationChange).toHaveBeenCalled();
        const lastCall =
          onProjectNavigationChange.mock.calls[onProjectNavigationChange.mock.calls.length - 1];
        const [{ navigationTree }] = lastCall;

        const [root] = navigationTree;
        expect(root.id).toBe('root');
        expect(root.children?.[0]).toMatchObject({
          id: 'group1',
          renderAs: 'panelOpener',
          children: [
            {
              id: 'management',
              title: 'Deeplink management',
            },
          ],
        });
      } catch (e) {
        errorHandler(type)(e);
      }
    };

    // -- Default navigation
    {
      const navigationBody: RootNavigationItemDefinition[] = [
        {
          type: 'navGroup',
          id: 'root',
          isCollapsible: false,
          children: [
            {
              id: 'group1',
              link: 'dashboards',
              renderAs: 'panelOpener',
              children: [{ link: 'management' }],
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
    }

    // -- With UI Components
    {
      const renderResult = renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="root" isCollapsible={false}>
              <Navigation.Group id="group1" link="dashboards" renderAs="panelOpener">
                <Navigation.Item link="management" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        ),
        onProjectNavigationChange,
      });
      await runTests('uiComponents', renderResult);
    }
  });

  test('should not render group if all children are hidden', async () => {
    const onProjectNavigationChange = getMockFn<ProjectNavigationChangeListener>();

    const runTests = async (type: TestType, { queryByTestId }: RenderResult) => {
      try {
        expect(queryByTestId(/panelOpener-root.group1/)).toBeNull();
        expect(queryByTestId(/panelOpener-root.group2/)).toBeNull();
        expect(queryByTestId(/panelOpener-root.group3/)).toBeVisible();
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
          isCollapsible: false,
          children: [
            {
              id: 'group1',
              link: 'dashboards',
              renderAs: 'panelOpener',
              children: [{ link: 'unknown' }],
            },
            {
              id: 'group2',
              link: 'dashboards',
              renderAs: 'panelOpener',
              children: [{ link: 'management', sideNavStatus: 'hidden' }],
            },
            {
              id: 'group3',
              link: 'dashboards',
              renderAs: 'panelOpener',
              children: [{ link: 'management' }], // sideNavStatus is "visible" by default
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
    }

    // -- With UI Components
    {
      const renderResult = renderNavigation({
        navigationElement: (
          <Navigation>
            <Navigation.Group id="root" isCollapsible={false}>
              <Navigation.Group id="group1" link="dashboards" renderAs="panelOpener">
                <Navigation.Item<any> link="unknown" />
              </Navigation.Group>
              <Navigation.Group id="group2" link="dashboards" renderAs="panelOpener">
                <Navigation.Item link="management" sideNavStatus="hidden" />
              </Navigation.Group>
              <Navigation.Group id="group3" link="dashboards" renderAs="panelOpener">
                <Navigation.Item link="management" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation>
        ),
        onProjectNavigationChange,
      });
      await runTests('uiComponents', renderResult);
    }
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

      const runTests = async (type: TestType, { queryByTestId }: RenderResult) => {
        try {
          queryByTestId(/panelOpener-root.group1/)?.click(); // open the panel

          expect(queryByTestId(/customPanelContent/)).toBeVisible();
          // Test that the selected node is correclty passed
          expect(queryByTestId(/customPanelSelectedNode/)?.textContent).toBe('root.group1');
          // Test that the active nodes are correclty passed
          expect(queryByTestId(/customPanelActiveNodes/)?.textContent).toBe(
            'activeGroup1activeItem1'
          );
          // Test that handler to close the panel is correctly passed
          queryByTestId(/customPanelCloseBtn/)?.click(); // close the panel
          expect(queryByTestId(/customPanelContent/)).toBeNull();
          expect(queryByTestId(/sideNavPanel/)).toBeNull();
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
            isCollapsible: false,
            children: [
              {
                id: 'group1',
                link: 'dashboards',
                renderAs: 'panelOpener',
                children: [{ link: 'management' }],
              },
            ],
          },
        ];

        const renderResult = renderNavigation({
          navTreeDef: { body: navigationBody },
          panelContentProvider,
          services: { activeNodes$ },
        });

        await runTests('treeDef', renderResult);

        renderResult.unmount();
      }

      // -- With UI Components
      {
        const renderResult = renderNavigation({
          navigationElement: (
            <Navigation panelContentProvider={panelContentProvider}>
              <Navigation.Group id="root" isCollapsible={false}>
                <Navigation.Group id="group1" link="dashboards" renderAs="panelOpener">
                  <Navigation.Item link="management" />
                </Navigation.Group>
              </Navigation.Group>
            </Navigation>
          ),
          services: { activeNodes$ },
        });
        await runTests('uiComponents', renderResult);
      }
    });
  });

  describe('auto generated content', () => {
    test('should rendre block groups with title', async () => {
      const runTests = async (
        type: TestType,
        { queryByTestId, queryAllByTestId }: RenderResult
      ) => {
        try {
          queryByTestId(/panelOpener-root.group1/)?.click(); // open the panel

          expect(queryByTestId(/panelGroupId-foo/)).toBeVisible();
          expect(queryByTestId(/panelGroupTitleId-foo/)?.textContent).toBe('Foo');

          const panelNavItems = queryAllByTestId(/panelNavItem/);
          expect(panelNavItems.length).toBe(2); // "item2" has been filtered out as it is hidden
          expect(panelNavItems.map(({ textContent }) => textContent?.trim())).toEqual([
            'Item 1',
            'Item 3',
          ]);
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
            isCollapsible: false,
            children: [
              {
                id: 'group1',
                link: 'dashboards',
                renderAs: 'panelOpener',
                children: [
                  {
                    id: 'foo',
                    title: 'Foo',
                    children: [
                      { id: 'item1', link: 'management', title: 'Item 1' },
                      { id: 'item2', link: 'management', title: 'Item 2', sideNavStatus: 'hidden' },
                      { id: 'item3', link: 'management', title: 'Item 3' },
                    ],
                  },
                ],
              },
            ],
          },
        ];

        const renderResult = renderNavigation({
          navTreeDef: { body: navigationBody },
        });

        await runTests('treeDef', renderResult);

        renderResult.unmount();
      }

      // -- With UI Components
      {
        const renderResult = renderNavigation({
          navigationElement: (
            <Navigation>
              <Navigation.Group id="root" isCollapsible={false}>
                <Navigation.Group id="group1" link="dashboards" renderAs="panelOpener">
                  <Navigation.Group id="foo" title="Foo">
                    <Navigation.Item id="item1" link="management" title="Item 1" />
                    <Navigation.Item
                      id="item2"
                      link="management"
                      sideNavStatus="hidden"
                      title="Item 2"
                    />
                    <Navigation.Item id="item3" link="management" title="Item 3" />
                  </Navigation.Group>
                </Navigation.Group>
              </Navigation.Group>
            </Navigation>
          ),
        });
        await runTests('uiComponents', renderResult);
      }
    });

    test('should rendre block groups without title', async () => {
      const runTests = async (
        type: TestType,
        { queryByTestId, queryAllByTestId }: RenderResult
      ) => {
        try {
          queryByTestId(/panelOpener-root.group1/)?.click(); // open the panel

          expect(queryByTestId(/panelGroupTitleId-foo/)).toBeNull(); // No title rendered

          const panelNavItems = queryAllByTestId(/panelNavItem/);
          expect(panelNavItems.length).toBe(2); // "item2" has been filtered out as it is hidden
          expect(panelNavItems.map(({ textContent }) => textContent?.trim())).toEqual([
            'Item 1',
            'Item 3',
          ]);
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
            isCollapsible: false,
            children: [
              {
                id: 'group1',
                link: 'dashboards',
                renderAs: 'panelOpener',
                children: [
                  {
                    id: 'foo',
                    children: [
                      { id: 'item1', link: 'management', title: 'Item 1' },
                      { id: 'item2', link: 'management', title: 'Item 2', sideNavStatus: 'hidden' },
                      { id: 'item3', link: 'management', title: 'Item 3' },
                    ],
                  },
                ],
              },
            ],
          },
        ];

        const renderResult = renderNavigation({
          navTreeDef: { body: navigationBody },
        });

        await runTests('treeDef', renderResult);

        renderResult.unmount();
      }

      // -- With UI Components
      {
        // const renderResult = renderNavigation({
        //   navigationElement: (
        //     <Navigation>
        //       <Navigation.Group id="root" isCollapsible={false}>
        //         <Navigation.Group id="group1" link="dashboards" renderAs="panelOpener">
        //           <Navigation.Group id="foo" title="Foo">
        //             <Navigation.Item id="item1" link="management" title="Item 1" />
        //             <Navigation.Item
        //               id="item2"
        //               link="management"
        //               sideNavStatus="hidden"
        //               title="Item 2"
        //             />
        //             <Navigation.Item id="item3" link="management" title="Item 3" />
        //           </Navigation.Group>
        //         </Navigation.Group>
        //       </Navigation.Group>
        //     </Navigation>
        //   ),
        // });
        // await runTests('uiComponents', renderResult);
      }
    });

    test('should rendre accordion groups', async () => {
      const runTests = async (
        type: TestType,
        { queryByTestId, queryAllByTestId, findByRole }: RenderResult
      ) => {
        try {
          queryByTestId(/panelOpener-root.group1/)?.click(); // open the panel

          expect(queryByTestId(/panelGroupId-foo/)).toBeVisible();

          const panelNavItems = queryAllByTestId(/panelNavItem/);
          expect(panelNavItems.length).toBe(2); // "item2" has been filtered out as it is hidden

          expect(queryByTestId(/panelNavItem-id-item1/)).not.toBeVisible(); // Accordion is collapsed
          expect(queryByTestId(/panelNavItem-id-item3/)).not.toBeVisible(); // Accordion is collapsed

          queryByTestId(/panelAccordionBtnId-foo/)?.click(); // Expand accordion

          expect(queryByTestId(/panelNavItem-id-item1/)).toBeVisible();
          expect(queryByTestId(/panelNavItem-id-item3/)).toBeVisible();
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
            isCollapsible: false,
            children: [
              {
                id: 'group1',
                link: 'dashboards',
                renderAs: 'panelOpener',
                children: [
                  {
                    id: 'foo',
                    title: 'Foo',
                    renderAs: 'accordion',
                    children: [
                      { id: 'item1', link: 'management', title: 'Item 1' },
                      { id: 'item2', link: 'management', title: 'Item 2', sideNavStatus: 'hidden' },
                      { id: 'item3', link: 'management', title: 'Item 3' },
                    ],
                  },
                ],
              },
            ],
          },
        ];

        const renderResult = renderNavigation({
          navTreeDef: { body: navigationBody },
        });

        await runTests('treeDef', renderResult);

        renderResult.unmount();
      }

      // -- With UI Components
      {
        const renderResult = renderNavigation({
          navigationElement: (
            <Navigation>
              <Navigation.Group id="root" isCollapsible={false}>
                <Navigation.Group id="group1" link="dashboards" renderAs="panelOpener">
                  <Navigation.Group id="foo" title="Foo" renderAs="accordion">
                    <Navigation.Item id="item1" link="management" title="Item 1" />
                    <Navigation.Item
                      id="item2"
                      link="management"
                      sideNavStatus="hidden"
                      title="Item 2"
                    />
                    <Navigation.Item id="item3" link="management" title="Item 3" />
                  </Navigation.Group>
                </Navigation.Group>
              </Navigation.Group>
            </Navigation>
          ),
        });
        await runTests('uiComponents', renderResult);
      }
    });
  });
});
