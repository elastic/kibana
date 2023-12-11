/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { ComponentMeta } from '@storybook/react';
import React, { EventHandler, FC, MouseEvent, useState, useEffect } from 'react';
import { of } from 'rxjs';

import {
  EuiButton,
  EuiCollapsibleNavBeta,
  EuiCollapsibleNavBetaProps,
  EuiHeader,
  EuiHeaderSection,
  EuiLink,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';

import type { ChromeNavLink } from '@kbn/core-chrome-browser';
import { NavigationStorybookMock, navLinksMock } from '../../mocks';
import mdx from '../../README.mdx';
import type { NavigationServices } from '../../types';
import { NavigationProvider } from '../services';
import { Navigation } from './components';
import { DefaultNavigation } from './default_navigation';
import { getPresets } from './nav_tree_presets';
import type { ProjectNavigationDefinition } from './types';
import { ContentProvider } from './components/panel';

const storybookMock = new NavigationStorybookMock();

interface Props {
  clickAction?: EventHandler<MouseEvent>;
  clickActionText?: string;
  children?: React.ReactNode | (({ isCollapsed }: { isCollapsed: boolean }) => React.ReactNode);
}

const NavigationWrapper: FC<Props & Partial<EuiCollapsibleNavBetaProps>> = (props) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const onCollapseToggle = (nextIsCollapsed: boolean) => {
    setIsCollapsed(nextIsCollapsed);
  };

  useEffect(() => {
    // Set padding to body to avoid unnecessary scrollbars
    document.body.style.paddingTop = '0px';
    document.body.style.paddingRight = '0px';
    document.body.style.paddingBottom = '0px';
  }, []);

  return (
    <>
      <EuiHeader position="fixed">
        <EuiHeaderSection side={props?.side}>
          <EuiCollapsibleNavBeta
            {...props}
            children={
              typeof props.children === 'function'
                ? props.children({ isCollapsed })
                : props.children
            }
            initialIsCollapsed={isCollapsed}
            onCollapseToggle={onCollapseToggle}
            css={
              props.css ?? {
                overflow: 'visible',
                clipPath: 'polygon(0 0, 300% 0, 300% 100%, 0 100%)',
              }
            }
          />
        </EuiHeaderSection>
      </EuiHeader>
      <EuiPageTemplate>
        <EuiPageTemplate.Section>
          {props.clickAction ? (
            <EuiButton color="text" onClick={props.clickAction}>
              {props.clickActionText ?? 'Click me'}
            </EuiButton>
          ) : (
            <p>Hello world</p>
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  );
};

const baseDeeplink: ChromeNavLink = {
  id: 'foo',
  title: 'Title from deep link',
  href: 'https://elastic.co',
  url: '/dashboard-mocked',
  baseUrl: '',
};

const createDeepLink = (id: string, title: string = baseDeeplink.title) => {
  return {
    ...baseDeeplink,
    id,
    title,
  };
};

const deepLinks: ChromeNavLink[] = [
  createDeepLink('item1'),
  createDeepLink('item2', 'Foo'),
  createDeepLink('item3'),
  createDeepLink('group1:item1'),
  createDeepLink('group1:groupA:groupI:item1'),
  createDeepLink('group1:groupA', 'Group title from deep link'),
  createDeepLink('group2', 'Group title from deep link'),
  createDeepLink('group2:item1'),
  createDeepLink('group2:item3'),
  createDeepLink('group:settings.logs'),
  createDeepLink('group:settings.signals'),
  createDeepLink('group:settings.tracing'),
];

const deepLinks$ = of({
  ...[...navLinksMock, ...deepLinks].reduce<Record<string, ChromeNavLink>>((acc, navLink) => {
    acc[navLink.id] = navLink;
    return acc;
  }, {}),
});

const simpleNavigationDefinition: ProjectNavigationDefinition<any> = {
  projectNavigationTree: [
    {
      id: 'example_projet',
      title: 'Example project',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      children: [
        {
          link: 'item1',
          title: 'Get started',
        },
        {
          link: 'item2',
          title: 'Alerts',
        },
        {
          link: 'item3',
          title: 'Dashboards',
        },
        {
          id: 'item4',
          title: 'External link',
          href: 'https://elastic.co',
        },
        {
          link: 'item5',
          title: 'Another link',
        },
        {
          id: 'group:settings',
          title: 'Settings',
          children: [
            {
              link: 'item1',
              title: 'Logs',
            },
            {
              link: 'item2',
              title: 'Signals',
            },
            {
              link: 'item3',
              title: 'Tracing',
            },
          ],
        },
      ],
    },
  ],
};

export const SimpleObjectDefinition = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    deepLinks$,
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      <NavigationProvider {...services}>
        <DefaultNavigation {...simpleNavigationDefinition} />
      </NavigationProvider>
    </NavigationWrapper>
  );
};

const groupExamplesDefinition: ProjectNavigationDefinition<any> = {
  navigationTree: {
    body: [
      // My custom project
      {
        type: 'navGroup',
        id: 'example_projet',
        title: 'Example project',
        icon: 'logoObservability',
        defaultIsCollapsed: false,
        children: [
          {
            title: 'Block group',
            children: [
              {
                id: 'item1',
                link: 'item1',
                title: 'Item 1',
              },
              {
                id: 'item2',
                link: 'item1',
                title: 'Item 2',
              },
              {
                id: 'item3',
                link: 'item1',
                title: 'Item 3',
              },
            ],
          },
          {
            title: 'Accordion group',
            renderAs: 'accordion',
            children: [
              {
                id: 'item1',
                link: 'item1',
                title: 'Item 1',
              },
              {
                id: 'item2',
                link: 'item1',
                title: 'Item 2',
              },
              {
                id: 'item3',
                link: 'item1',
                title: 'Item 3',
              },
            ],
          },
          {
            children: [
              {
                id: 'item1',
                link: 'item1',
                title: 'Block group',
              },
              {
                id: 'item2',
                link: 'item1',
                title: 'without',
              },
              {
                id: 'item3',
                link: 'item1',
                title: 'title',
              },
            ],
          },
          {
            id: 'group:settings',
            link: 'item1',
            title: 'Panel group',
            renderAs: 'panelOpener',
            children: [
              {
                title: 'Group 1',
                children: [
                  {
                    link: 'group:settings.logs',
                    title: 'Logs',
                  },
                  {
                    link: 'group:settings.signals',
                    title: 'Signals',
                  },
                  {
                    id: 'group:settings.signals-2',
                    link: 'group:settings.signals',
                    title: 'Signals - should NOT appear',
                    sideNavStatus: 'hidden', // Should not appear
                  },
                  {
                    link: 'group:settings.tracing',
                    title: 'Tracing',
                  },
                ],
              },
              {
                id: 'group.nestedGroup',
                link: 'group:settings.tracing',
                title: 'Group 2',
                children: [
                  {
                    id: 'item1',
                    link: 'group:settings.signals',
                    title: 'Some link title',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    footer: [
      {
        type: 'navGroup',
        ...getPresets('devtools'),
      },
    ],
  },
};

export const GroupsExamples = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    deepLinks$,
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      {({ isCollapsed }) => (
        <NavigationProvider {...services} isSideNavCollapsed={isCollapsed}>
          <DefaultNavigation {...groupExamplesDefinition} />
        </NavigationProvider>
      )}
    </NavigationWrapper>
  );
};

const navigationDefinition: ProjectNavigationDefinition<any> = {
  navigationTree: {
    body: [
      // My custom project
      {
        type: 'navGroup',
        id: 'example_projet',
        title: 'Example project',
        icon: 'logoObservability',
        defaultIsCollapsed: false,
        children: [
          {
            link: 'item1',
            title: 'Get started',
          },
          {
            title: 'Group 1',
            children: [
              {
                id: 'item1',
                link: 'item1',
                title: 'Item 1',
              },
              {
                id: 'item2',
                link: 'item1',
                title: 'Item 2',
              },
              {
                id: 'item3',
                link: 'item1',
                title: 'Item 3',
              },
            ],
          },
          {
            link: 'item2',
            title: 'Alerts',
          },
          {
            id: 'item2-2',
            link: 'item2',
            title: 'Item should NOT appear!!',
            sideNavStatus: 'hidden', // Should not appear
          },
          {
            link: 'item3',
            title: 'Some other node',
          },
          {
            id: 'group:settings-2',
            title: 'Settings as nav Item',
            link: 'item1',
            renderAs: 'item', // Render just like any other item, even if it has children
            children: [
              {
                link: 'group:settings.logs',
                title: 'Logs',
              },
              {
                link: 'group:settings.signals',
                title: 'Signals',
              },
              {
                id: 'group:settings.signals2',
                link: 'group:settings.signals',
                title: 'Signals - should NOT appear',
                sideNavStatus: 'hidden', // Should not appear
              },
              {
                link: 'group:settings.tracing',
                title: 'Tracing',
              },
            ],
          },
          {
            id: 'group:settings',
            link: 'item1',
            title: 'Settings as panel opener',
            renderAs: 'panelOpener',
            children: [
              {
                title: 'Group 1',
                children: [
                  {
                    link: 'group:settings.logs',
                    title: 'Logs',
                  },
                  {
                    link: 'group:settings.signals',
                    title: 'Signals',
                  },
                  {
                    id: 'group:settings.signals-2',
                    link: 'group:settings.signals',
                    title: 'Signals - should NOT appear',
                    sideNavStatus: 'hidden', // Should not appear
                  },
                  {
                    link: 'group:settings.tracing',
                    title: 'Tracing',
                  },
                ],
              },
              {
                children: [
                  {
                    id: 'group.nestedGroup',
                    link: 'group:settings.tracing',
                    title: 'Group 2',
                    renderAs: 'item',
                    children: [
                      {
                        id: 'item1',
                        link: 'group:settings.signals',
                        title: 'Hidden - should NOT appear',
                        sideNavStatus: 'hidden', // Should not appear
                      },
                    ],
                  },
                ],
              },
              {
                children: [
                  {
                    id: 'group.nestedGroup',
                    link: 'group:settings.tracing',
                    title: 'Just an item in a group',
                  },
                ],
              },
            ],
          },
          {
            id: 'group:settings.hidden',
            title: 'Settings 1 - should NOT appear', // sideNavStatus is 'hidden'
            sideNavStatus: 'hidden',
            children: [
              {
                link: 'group:settings.logs',
                title: 'Logs',
              },
            ],
          },
          {
            id: 'group:settings.childrenHidden',
            link: 'item1',
            title: 'Settings 2 - should NOT appear', // All children are hidden
            children: [
              {
                link: 'group:settings.logs',
                title: 'Logs',
                sideNavStatus: 'hidden',
              },
            ],
          },
        ],
      },
      // Add ml
      {
        type: 'preset',
        preset: 'ml',
      },
      {
        type: 'navItem',
        title: 'Custom link at root level',
      },
      {
        type: 'navGroup',
        id: 'test_all_hidden',
        title: 'Test group render as Item',
        renderAs: 'item',
        link: 'item1',
        children: [
          {
            id: 'test.item1',
            link: 'item1',
          },
        ],
      },
      {
        type: 'navItem',
        icon: 'logoElastic',
        link: 'ml',
        title: 'Link at root level + icon',
      },
      // And specific links from analytics
      {
        type: 'navGroup',
        ...getPresets('analytics'),
        title: 'My analytics', // Change the title
        children: getPresets('analytics').children.map((child) => ({
          ...child,
          children: child.children?.filter((item) => {
            // Hide discover and dashboard
            return item.link !== 'discover' && item.link !== 'dashboards';
          }),
        })),
      },
    ],
    footer: [
      {
        type: 'recentlyAccessed',
        defaultIsCollapsed: true,
        // Override the default recently accessed items with our own
        recentlyAccessed$: of([
          {
            label: 'My own recent item',
            id: '1234',
            link: '/app/example/39859',
          },
          {
            label: 'I also own this',
            id: '4567',
            link: '/app/example/39859',
          },
        ]),
      },
      {
        type: 'navGroup',
        ...getPresets('devtools'),
      },
    ],
  },
};

export const ComplexObjectDefinition = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    deepLinks$,
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      <NavigationProvider {...services}>
        <DefaultNavigation {...navigationDefinition} />
      </NavigationProvider>
    </NavigationWrapper>
  );
};

const panelContentProvider: ContentProvider = (id: string) => {
  if (id === 'example_projet.group:openpanel1') {
    return; // Use default title & content
  }

  if (id === 'example_projet.group:openpanel2') {
    // Custom content
    return {
      content: ({ closePanel }) => {
        return (
          <div>
            <EuiText>This is a custom component to render in the panel.</EuiText>
            <EuiButton onClick={() => closePanel()}>Close panel</EuiButton>
          </div>
        );
      },
    };
  }

  if (id === 'example_projet.group:openpanel3') {
    return {
      title: <div style={{ backgroundColor: 'yellow', fontWeight: 600 }}>Custom title</div>,
    };
  }
};

const navigationDefinitionWithPanel: ProjectNavigationDefinition<any> = {
  navigationTree: {
    body: [
      // My custom project
      {
        type: 'navGroup',
        id: 'example_projet',
        title: 'Example project',
        icon: 'logoObservability',
        defaultIsCollapsed: false,
        isCollapsible: false,
        children: [
          {
            link: 'item1',
            title: 'Get started',
          },
          {
            link: 'item2',
            title: 'Alerts',
          },
          {
            // Panel with default content
            // Groups with title
            id: 'group:openpanel1',
            title: 'Open panel (1)',
            renderAs: 'panelOpener',
            link: 'item1',
            children: [
              {
                title: 'Group 1',
                children: [
                  {
                    link: 'group:settings.logs',
                    title: 'Logs',
                    icon: 'logoObservability',
                  },
                  {
                    link: 'group:settings.signals',
                    title: 'Signals',
                    openInNewTab: true,
                  },
                  {
                    link: 'group:settings.tracing',
                    title: 'Tracing',
                    withBadge: true, // Default to "Beta" badge
                  },
                ],
              },
              {
                title: 'Group 2',
                children: [
                  {
                    id: 'group2:settings.logs',
                    link: 'group:settings.logs',
                    title: 'Logs',
                  },
                  {
                    id: 'group2:settings.signals',
                    link: 'group:settings.signals',
                    title: 'Signals',
                  },
                  {
                    id: 'group2:settings.tracing',
                    link: 'group:settings.tracing',
                    title: 'Tracing',
                  },
                ],
              },
            ],
          },
          {
            // Panel with default content
            // Groups with **not** title
            id: 'group.openpanel2',
            title: 'Open panel (2)',
            renderAs: 'panelOpener',
            link: 'item1',
            children: [
              {
                appendHorizontalRule: true, // Add a separator after the group
                children: [
                  {
                    link: 'group:settings.logs',
                    title: 'Logs',
                  },
                  {
                    link: 'group:settings.signals',
                    title: 'Signals',
                  },
                  {
                    link: 'group:settings.tracing',
                    title: 'Tracing',
                    withBadge: true, // Default to "Beta" badge
                  },
                ],
              },
              {
                id: 'group2',
                children: [
                  {
                    id: 'group2:settings.logs',
                    link: 'group:settings.logs',
                    title: 'Logs',
                  },
                  {
                    id: 'group2:settings.signals',
                    link: 'group:settings.signals',
                    title: 'Signals',
                  },
                  {
                    id: 'group2:settings.tracing',
                    link: 'group:settings.tracing',
                    title: 'Tracing',
                  },
                ],
              },
            ],
          },
          {
            // Panel with default content
            // Accordion to wrap groups
            id: 'group.openpanel3',
            title: 'Open panel (3)',
            renderAs: 'panelOpener',
            link: 'item1',
            children: [
              {
                id: 'group1',
                appendHorizontalRule: true,
                children: [
                  {
                    link: 'group:settings.logs',
                    title: 'Logs',
                  },
                  {
                    link: 'group:settings.signals',
                    title: 'Signals',
                  },
                  {
                    link: 'group:settings.tracing',
                    title: 'Tracing',
                    withBadge: true, // Default to "Beta" badge
                  },
                ],
              },
              // Groups with accordion
              {
                id: 'group2',
                title: 'MANAGEMENT',
                renderAs: 'accordion',
                children: [
                  {
                    id: 'group2-A',
                    title: 'Group 1',
                    children: [
                      {
                        link: 'group:settings.logs',
                        title: 'Logs',
                      },
                      {
                        link: 'group:settings.signals',
                        title: 'Signals',
                      },
                      {
                        link: 'group:settings.tracing',
                        title: 'Tracing',
                        withBadge: true, // Default to "Beta" badge
                      },
                    ],
                  },
                  {
                    id: 'group2-B',
                    title: 'Group 2 (marked as collapsible)',
                    renderAs: 'accordion',
                    children: [
                      {
                        id: 'group2:settings.logs',
                        link: 'group:settings.logs',
                        title: 'Logs',
                      },
                      {
                        id: 'group2:settings.signals',
                        link: 'group:settings.signals',
                        title: 'Signals',
                      },
                      {
                        id: 'group2:settings.tracing',
                        link: 'group:settings.tracing',
                        title: 'Tracing',
                      },
                    ],
                  },
                  {
                    id: 'group2-C',
                    title: 'Group 3',
                    children: [
                      {
                        id: 'group2:settings.logs',
                        link: 'group:settings.logs',
                        title: 'Logs',
                      },
                      {
                        id: 'group2:settings.signals',
                        link: 'group:settings.signals',
                        title: 'Signals',
                      },
                      {
                        id: 'group2:settings.tracing',
                        link: 'group:settings.tracing',
                        title: 'Tracing',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            // Panel with nav group title that acts like nav items
            id: 'group.openpanel4',
            title: 'Open panel (4) - sideNavStatus',
            renderAs: 'panelOpener',
            link: 'item1',
            children: [
              {
                id: 'root',
                children: [
                  {
                    title: 'Group renders as "item" (1)',
                    link: 'item1',
                    renderAs: 'item',
                    children: [
                      {
                        link: 'group:settings.logs',
                        title: 'Logs',
                      },
                      {
                        link: 'group:settings.signals',
                        title: 'Signals',
                      },
                    ],
                  },
                  {
                    link: 'group:settings.logs',
                    title: 'Item 2',
                  },
                  {
                    link: 'group:settings.logs2',
                    title: 'Item should NOT appear!', // Should not appear
                    sideNavStatus: 'hidden',
                  },
                  {
                    title: 'Group should NOT appear!',
                    id: 'group:settings.logs3',
                    link: 'group:settings.logs',
                    sideNavStatus: 'hidden', // This group should not appear
                    children: [
                      {
                        link: 'group:settings.logs',
                        title: 'Logs',
                      },
                      {
                        link: 'group:settings.signals',
                        title: 'Signals',
                      },
                    ],
                  },
                  {
                    title: 'Group renders as "item" (2)',
                    id: 'group2.renderAsItem',
                    link: 'item1',
                    renderAs: 'item',
                    children: [
                      {
                        id: 'group2:settings.logs',
                        link: 'group:settings.logs',
                        title: 'Logs',
                        sideNavStatus: 'hidden',
                      },
                      {
                        id: 'group2:settings.signals',
                        link: 'group:settings.signals',
                        title: 'Signals',
                        sideNavStatus: 'hidden',
                      },
                      {
                        id: 'group2:settings.tracing',
                        link: 'group:settings.tracing',
                        title: 'Tracing',
                        sideNavStatus: 'hidden',
                      },
                    ],
                  },
                ],
              },
              // Groups with accordion
              {
                id: 'group2',
                title: 'MANAGEMENT',
                renderAs: 'accordion',
                children: [
                  {
                    id: 'group2-A',
                    title: 'Group 1',
                    children: [
                      {
                        link: 'group:settings.logs',
                        title: 'Logs',
                      },
                      {
                        link: 'group:settings.signals',
                        title: 'Signals',
                      },
                      {
                        link: 'group:settings.tracing',
                        title: 'Tracing',
                        withBadge: true, // Default to "Beta" badge
                      },
                    ],
                  },
                  {
                    id: 'root-groupB',
                    children: [
                      {
                        id: 'group2-B',
                        link: 'item1',
                        title: 'Group renders as "item" (3)',
                        renderAs: 'item', // This group renders as a normal item
                        children: [
                          {
                            id: 'group2:settings.logs',
                            link: 'group:settings.logs',
                            title: 'Logs',
                          },
                          {
                            id: 'group2:settings.signals',
                            link: 'group:settings.signals',
                            title: 'Signals',
                          },
                          {
                            id: 'group2:settings.tracing',
                            link: 'group:settings.tracing',
                            title: 'Tracing',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    id: 'group2-C',
                    title: 'Group 3',
                    children: [
                      {
                        id: 'group2:settings.logs',
                        link: 'group:settings.logs',
                        title: 'Logs',
                      },
                      {
                        title: 'Yet another group as item',
                        link: 'item1',
                        renderAs: 'item',
                        children: [
                          {
                            id: 'group2:settings.logs',
                            link: 'group:settings.logs',
                            title: 'Logs',
                          },
                          {
                            id: 'group2:settings.signals',
                            link: 'group:settings.signals',
                            title: 'Signals',
                          },
                        ],
                      },
                      {
                        id: 'group2:settings.signals',
                        link: 'group:settings.signals',
                        title: 'Signals',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            // Panel where all children are hidden. The "open panel" icon should NOT
            // appear next to the node title
            id: 'group.openpanel5',
            title: 'Open panel (5) - all children hidden',
            renderAs: 'panelOpener',
            link: 'item1',
            children: [
              {
                link: 'test1',
                sideNavStatus: 'hidden',
              },
              {
                title: 'Some group',
                children: [
                  {
                    link: 'item1',
                    title: 'My first group item',
                    sideNavStatus: 'hidden',
                  },
                ],
              },
            ],
          },
          {
            id: 'group.openpanel6',
            title: 'Open panel (custom content)',
            renderAs: 'panelOpener',
            link: 'item1',
            children: [
              {
                link: 'group:settings.logs',
                title: 'Logs',
              },
              {
                link: 'group:settings.signals',
                title: 'Signals',
              },
              {
                link: 'group:settings.tracing',
                title: 'Tracing',
              },
            ],
          },
          {
            id: 'group.openpanel7',
            title: 'Open panel (custom title)',
            renderAs: 'panelOpener',
            link: 'item1',
            children: [
              {
                link: 'group:settings.logs',
                title: 'Those links',
              },
              {
                link: 'group:settings.signals',
                title: 'are automatically',
              },
              {
                link: 'group:settings.tracing',
                title: 'generated',
              },
            ],
          },
        ],
      },
    ],
  },
};

export const ObjectDefinitionWithPanel = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    deepLinks$,
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      {({ isCollapsed }) => (
        <NavigationProvider {...services} isSideNavCollapsed={isCollapsed}>
          <DefaultNavigation
            {...navigationDefinitionWithPanel}
            panelContentProvider={panelContentProvider}
          />
        </NavigationProvider>
      )}
    </NavigationWrapper>
  );
};

export const WithUIComponentsTiny = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    deepLinks$,
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      {({ isCollapsed }) => (
        <NavigationProvider {...services} isSideNavCollapsed={isCollapsed}>
          <Navigation>
            <Navigation.Group
              // id="example_projet"
              title="Example project"
              icon="logoObservability"
              defaultIsCollapsed={false}
              isCollapsible={false}
            >
              <Navigation.Group
                // id="hello"
                title="Hello"
                renderAs="accordion"
                defaultIsCollapsed={false}
              >
                <Navigation.Item<any> id="item1" link="item1" />
              </Navigation.Group>
            </Navigation.Group>
            <Navigation.Item<any> id="item2" link="item1" title="YEAH!!" icon="launch" />
            <Navigation.Footer>
              <Navigation.Item link="dev_tools" icon="editorCodeBlock" title="Developer tools" />
              <Navigation.Group
                // id="project_settings_project_nav"
                title="Project settings"
                breadcrumbStatus="hidden"
                icon="gear"
              >
                <Navigation.Item link="management" title="Management" />
                <Navigation.Group title="Sub group" icon="gear">
                  <Navigation.Item link="management" title="Management" />
                  <Navigation.Group title="Sub group" icon="gear">
                    <Navigation.Item link="management" title="Management" />
                  </Navigation.Group>
                </Navigation.Group>
              </Navigation.Group>
            </Navigation.Footer>
          </Navigation>
        </NavigationProvider>
      )}
    </NavigationWrapper>
  );
};

export const WithUIComponents = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    deepLinks$,
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      {({ isCollapsed }) => (
        <NavigationProvider {...services} isSideNavCollapsed={isCollapsed}>
          <Navigation>
            <Navigation.RecentlyAccessed />

            <Navigation.Group
              id="example_projet"
              title="Example project"
              icon="logoObservability"
              defaultIsCollapsed={false}
            >
              <Navigation.Item<any> id="item1" link="item1" />
              {/* <Navigation.Item id="item2" title="Alerts">
                {(navNode) => {
                  return (
                    <div className="euiSideNavItemButton">
                      <EuiText size="s">{`Render prop: ${navNode.id} - ${navNode.title}`}</EuiText>
                    </div>
                  );
                }}
              </Navigation.Item> */}
              <Navigation.Item id="item3" title="Title in ReactNode">
                <div className="euiSideNavItemButton">
                  <EuiLink>Title in ReactNode</EuiLink>
                </div>
              </Navigation.Item>
              <Navigation.Item id="item4" title="External link" href="https://elastic.co" />

              <Navigation.Group<any> id="group:block" title="This is a block group">
                <Navigation.Group id="group1">
                  <Navigation.Item<any> link="group:settings.logs" title="Logs" />
                  <Navigation.Item<any> link="group:settings.signals" title="Signals" withBadge />
                  <Navigation.Item<any> link="group:settings.tracing" title="Tracing" />
                </Navigation.Group>
                <Navigation.Group id="group2" title="Nested group" renderAs="accordion">
                  <Navigation.Item<any> link="group:settings.logs" title="Logs" />
                  <Navigation.Item<any> link="group:settings.signals" title="Signals" />
                  <Navigation.Item<any> link="group:settings.tracing" title="Tracing" />
                </Navigation.Group>
              </Navigation.Group>

              <Navigation.Group<any>
                id="group:openPanel"
                link="item1"
                title="Open panel"
                renderAs="panelOpener"
              >
                <Navigation.Group id="group1">
                  <Navigation.Item<any> link="group:settings.logs" title="Logs" />
                  <Navigation.Item<any> link="group:settings.signals" title="Signals" withBadge />
                  <Navigation.Item<any> link="group:settings.tracing" title="Tracing" />
                </Navigation.Group>
                <Navigation.Group id="group2" appendHorizontalRule title="Group 2">
                  <Navigation.Item<any> link="group:settings.logs" title="Logs" />
                  <Navigation.Item<any> link="group:settings.signals" title="Signals" />
                  <Navigation.Item<any> link="group:settings.tracing" title="Tracing" />
                </Navigation.Group>
                <Navigation.Group title="MANAGEMENT" id="group3" renderAs="accordion">
                  <Navigation.Group title="Group A" id="group3-a">
                    <Navigation.Item<any> link="group:settings.logs" title="Logs" />
                    <Navigation.Item<any>
                      link="group:settings.signals"
                      title="Signals"
                      withBadge
                      badgeOptions={{ text: 'coolio' }}
                    />
                    <Navigation.Item<any> link="group:settings.tracing" title="Tracing" />
                  </Navigation.Group>
                  <Navigation.Group title="Group B" id="group3-b">
                    <Navigation.Item<any> link="group:settings.logs" title="Logs" />
                    <Navigation.Item<any> link="group:settings.signals" title="Signals" />
                    <Navigation.Item<any> link="group:settings.tracing" title="Tracing" />
                  </Navigation.Group>
                  <Navigation.Group title="Group C" id="group3-c">
                    <Navigation.Item<any> link="group:settings.logs" title="Logs" />
                    <Navigation.Item<any> link="group:settings.signals" title="Signals" />
                    <Navigation.Item<any> link="group:settings.tracing" title="Tracing" />
                  </Navigation.Group>
                </Navigation.Group>
              </Navigation.Group>
            </Navigation.Group>

            <Navigation.Group preset="analytics" defaultIsCollapsed={false} />
            <Navigation.Group preset="ml" />

            <Navigation.Footer>
              <Navigation.Group link="dev_tools" icon="editorCodeBlock" title="Developer tools" />
              <Navigation.Group
                id="project_settings_project_nav"
                title="Project settings"
                breadcrumbStatus="hidden"
                icon="gear"
              >
                <Navigation.Item link="management" title="Management" />
                <Navigation.Item id="cloudLinkUserAndRoles" cloudLink="userAndRoles" />
                <Navigation.Item id="cloudLinkPerformance" cloudLink="performance" />
                <Navigation.Item id="cloudLinkBilling" cloudLink="billingAndSub" />
              </Navigation.Group>
            </Navigation.Footer>
          </Navigation>
        </NavigationProvider>
      )}
    </NavigationWrapper>
  );
};

export const MinimalUI = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    deepLinks$,
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      <NavigationProvider {...services}>
        <Navigation>
          <Navigation.RecentlyAccessed defaultIsCollapsed />

          <Navigation.Group
            id="example_projet"
            title="Minimal project"
            icon="gear"
            defaultIsCollapsed={false}
          >
            <Navigation.Group id="root">
              <Navigation.Item id="item1" title="Get started" />
              <Navigation.Item id="item2" title="Alerts" />
              <Navigation.Item id="item3" title="Some children node">
                <EuiText size="s">
                  <EuiLink>Some children node</EuiLink>
                </EuiText>
              </Navigation.Item>
            </Navigation.Group>

            <Navigation.Group id="group:settings" title="Settings">
              <Navigation.Item id="logs" title="Logs" />
              <Navigation.Item id="signals" title="Signals" />
              <Navigation.Item id="tracing" title="Tracing" />

              <Navigation.Group id="sub:settings" title="More" defaultIsCollapsed={false}>
                <Navigation.Item id="logs" title="Coolio" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation.Group>
        </Navigation>
      </NavigationProvider>
    </NavigationWrapper>
  );
};

export default {
  title: 'Chrome/Navigation',
  description: 'Navigation container to render items for cross-app linking',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  component: WithUIComponents,
} as ComponentMeta<typeof WithUIComponents>;
