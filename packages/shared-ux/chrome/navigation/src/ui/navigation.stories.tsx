/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ComponentMeta } from '@storybook/react';
import React, { EventHandler, FC, MouseEvent, useState, useEffect } from 'react';
import { of } from 'rxjs';

import {
  EuiButton,
  EuiCollapsibleNavBeta,
  EuiCollapsibleNavBetaProps,
  EuiHeader,
  EuiHeaderSection,
  EuiPageTemplate,
  EuiText,
} from '@elastic/eui';

import type { NavigationTreeDefinitionUI } from '@kbn/core-chrome-browser';
import { NavigationStorybookMock } from '../../mocks';
import mdx from '../../README.mdx';
import type { NavigationServices } from '../types';
import { NavigationProvider } from '../services';
import { Navigation } from './navigation';
import { ContentProvider } from './components/panel';

const storybookMock = new NavigationStorybookMock();

interface Props {
  clickAction?: EventHandler<MouseEvent>;
  clickActionText?: string;
  children?: React.ReactNode | (({ isCollapsed }: { isCollapsed: boolean }) => React.ReactNode);
}

const NavigationWrapper: FC<Props & Omit<Partial<EuiCollapsibleNavBetaProps>, 'children'>> = (
  props
) => {
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

const groupExamplesNavigationTree: NavigationTreeDefinitionUI = {
  body: [
    // My custom project
    {
      id: 'example_projet',
      title: 'Example project',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      path: 'example_projet',
      children: [
        {
          id: 'blockGroup',
          path: 'example_projet.blockGroup',
          title: 'Block group',
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              href: '/app/kibana',
              path: 'group1.item1',
            },
            {
              id: 'item2',
              title: 'Item 2',
              href: '/app/kibana',
              path: 'group1.item2',
            },
            {
              id: 'item3',

              title: 'Item 3',
              href: '/app/kibana',
              path: 'group1.item3',
            },
          ],
        },
        {
          id: 'accordionGroup',
          path: 'example_projet.accordionGroup',
          title: 'Accordion group',
          renderAs: 'accordion',
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              href: '/app/kibana',
              path: 'group1.item1',
            },
            {
              id: 'item2',
              title: 'Item 2',
              href: '/app/kibana',
              path: 'group1.item1',
            },
            {
              id: 'item3',
              title: 'Item 3',
              href: '/app/kibana',
              path: 'group1.item1',
            },
          ],
        },
        {
          id: 'groupWithouTitle',
          path: 'example_projet.groupWithouTitle',
          title: '',
          children: [
            {
              id: 'item1',
              title: 'Block group',
              href: '/app/kibana',
              path: 'group1.item1',
            },
            {
              id: 'item2',
              title: 'without',
              href: '/app/kibana',
              path: 'group1.item1',
            },
            {
              id: 'item3',
              title: 'title',
              href: '/app/kibana',
              path: 'group1.item1',
            },
          ],
        },
        {
          id: 'panelGroup',
          href: '/app/kibana',
          title: 'Panel group',
          path: 'example_projet.panelGroup',
          renderAs: 'panelOpener',
          children: [
            {
              id: 'group1',
              title: 'Group 1',
              path: 'panelGroup.group1',
              children: [
                {
                  id: 'logs',
                  href: '/app/kibana',
                  path: 'group1.item1',
                  title: 'Logs',
                },
                {
                  id: 'signals',
                  title: 'Signals',
                  href: '/app/kibana',
                  path: 'group1.item1',
                },
                {
                  id: 'signals-2',
                  title: 'Signals - should NOT appear',
                  href: '/app/kibana',
                  path: 'group1.item1',
                  sideNavStatus: 'hidden', // Should not appear
                },
                {
                  id: 'tracing',
                  title: 'Tracing',
                  href: '/app/kibana',
                  path: 'group1.item1',
                },
              ],
            },
            {
              id: 'group2',
              title: 'Group 2',
              path: 'panelGroup.group2',
              children: [
                {
                  id: 'item1',
                  path: 'panelGroup.group2.item1',
                  href: '/app/kibana',
                  title: 'Some link title',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const GroupsExamples = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      {({ isCollapsed }) => (
        <NavigationProvider {...services} isSideNavCollapsed={isCollapsed}>
          <Navigation navigationTree$={of(groupExamplesNavigationTree)} />
        </NavigationProvider>
      )}
    </NavigationWrapper>
  );
};

const navigationTree: NavigationTreeDefinitionUI = {
  body: [
    // My custom project
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
      id: 'example_projet',
      title: 'Example project',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      path: 'example_projet',
      children: [
        {
          id: 'item1',
          href: '/app/kibana',
          path: 'example_projet.item1',
          title: 'Get started',
        },
        {
          title: 'Group 1',
          id: 'group1',
          path: 'example_projet.group1',
          children: [
            {
              id: 'item1',
              title: 'Item 1',
              href: '/app/kibana',
              path: 'example_projet.group1.item1',
            },
            {
              id: 'item2',
              title: 'Item 2',
              href: '/app/kibana',
              path: 'example_projet.group1.item1',
            },
            {
              id: 'item3',
              title: 'Item 3',
              href: '/app/kibana',
              path: 'example_projet.group1.item1',
            },
          ],
        },
        {
          id: 'item2',
          title: 'Alerts',
          href: '/app/kibana',
          path: 'example_projet.item2',
        },
        {
          id: 'item2-2',
          title: 'Item should NOT appear!!',
          sideNavStatus: 'hidden', // Should not appear
          href: '/app/kibana',
          path: 'example_projet.item2-2',
        },
        {
          id: 'item3',
          title: 'Some other node',
          href: '/app/kibana',
          path: 'example_projet.item3',
        },
        {
          id: 'group:settingsAsNavItem',
          title: 'Settings as nav Item',
          href: '/app/kibana',
          path: 'example_projet.group:settingsAsNavItem',
          renderAs: 'item', // Render just like any other item, even if it has children
          children: [
            {
              id: 'logs',
              title: 'Logs',
              href: '/app/kibana',
              path: 'example_projet.group:settingsAsNavItem.logs',
            },
            {
              id: 'signals',
              title: 'Signals',
              href: '/app/kibana',
              path: 'example_projet.group:settingsAsNavItem.signals',
            },
            {
              id: 'signalsHidden',
              title: 'Signals - should NOT appear',
              sideNavStatus: 'hidden', // Should not appear
              href: '/app/kibana',
              path: 'example_projet.group:settingsAsNavItem.signalsHidden',
            },
            {
              id: 'tracing',
              title: 'Tracing',
              href: '/app/kibana',
              path: 'example_projet.group:settingsAsNavItem.tracing',
            },
          ],
        },
        {
          id: 'group:settingsAsPanelOpener',
          title: 'Settings panel opener',
          path: 'example_projet.group:settingsAsPanelOpener',
          renderAs: 'panelOpener',
          children: [
            {
              id: 'group1',
              title: 'Group 1',
              path: 'example_projet.group:settingsAsPanelOpener.group1',
              children: [
                {
                  id: 'logs',
                  title: 'Logs',
                  href: '/app/kibana',
                  path: 'example_projet.group:settingsAsPanelOpener.group1.logs',
                },
                {
                  id: 'signals',
                  title: 'Signals',
                  href: '/app/kibana',
                  path: 'example_projet.group:settingsAsPanelOpener.group1.signals',
                },
                {
                  id: 'signals-2',
                  title: 'Signals - should NOT appear',
                  sideNavStatus: 'hidden', // Should not appear
                  href: '/app/kibana',
                  path: 'example_projet.group:settingsAsPanelOpener.group1.signals',
                },
                {
                  id: 'tracing',
                  title: 'Tracing',
                  href: '/app/kibana',
                  path: 'example_projet.group:settingsAsPanelOpener.group1.tracing',
                },
              ],
            },
            {
              id: 'group2',
              title: 'Group 2',
              path: 'example_projet.group:settingsAsPanelOpener.group2',
              children: [
                {
                  id: 'nestedGroup',
                  title: 'Nested group',
                  renderAs: 'item',
                  path: 'example_projet.group:settingsAsPanelOpener.group2.nestedGroup',
                  href: '/app/kibana',
                  children: [
                    {
                      id: 'item1',
                      path: 'example_projet.group:settingsAsPanelOpener.group2.nestedGroup.item1',
                      title: 'Hidden - should NOT appear',
                    },
                  ],
                },
              ],
            },
            {
              id: 'group3',
              title: '',
              path: 'example_projet.group:settingsAsPanelOpener.group3',
              children: [
                {
                  id: 'nestedGroup',
                  title: 'Just an item in a group',
                  path: 'example_projet.group:settingsAsPanelOpener.group3.nestedGroup',
                  href: '/app/kibana',
                },
              ],
            },
          ],
        },
        {
          id: 'group:settingsIsHidden',
          title: 'Settings - should NOT appear', // sideNavStatus is 'hidden'
          sideNavStatus: 'hidden',
          path: 'example_projet.group:settingsIsHidden',
          children: [
            {
              id: 'logs',
              title: 'Logs',
              href: '/app/kibana',
              path: 'example_projet.group:settingsIsHidden.logs',
            },
          ],
        },
        {
          id: 'group:settingsWithChildrenHidden',
          title: 'Settings - should NOT appear', // All children are hidden
          path: 'example_projet.group:settingsWithChildrenHidden',
          children: [
            {
              id: 'logs',
              title: 'Logs',
              sideNavStatus: 'hidden',
              href: '/app/kibana',
              path: 'example_projet.group:settingsWithChildrenHidden.logs',
            },
          ],
        },
      ],
    },
    {
      id: 'linkAtRootLevel',
      title: 'Custom link at root level',
      href: '/app/kibana',
      path: 'linkAtRootLevel',
    },
    {
      id: 'groupRenderAsItem',
      title: 'Test group render as Item',
      renderAs: 'item',
      href: '/app/kibana',
      path: 'groupRenderAsItem',
      children: [
        {
          id: 'item1',
          title: 'Item 1',
          href: '/app/kibana',
          path: 'groupRenderAsItem.item1',
        },
      ],
    },
    {
      id: 'linkAtRootLevelWithIcon',
      icon: 'logoElastic',
      title: 'Link at root level + icon',
      href: '/app/kibana',
      path: 'linkAtRootLevelWithIcon',
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
  ],
};

export const ComplexObjectDefinition = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      {({ isCollapsed }) => (
        <NavigationProvider {...services} isSideNavCollapsed={isCollapsed}>
          <Navigation navigationTree$={of(navigationTree)} />
        </NavigationProvider>
      )}
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

const navigationTreeWithPanels: NavigationTreeDefinitionUI = {
  body: [
    // My custom project
    {
      id: 'example_projet',
      title: 'Example project',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      isCollapsible: false,
      path: 'example_projet',
      children: [
        {
          id: 'item1',
          href: '/app/kibana',
          path: 'example_projet.item1',
          title: 'Get started',
        },
        {
          id: 'item2',
          href: '/app/kibana',
          path: 'example_projet.item2',
          title: 'Alerts',
        },
        {
          // Panel with default content
          // Groups with title
          id: 'group:openpanel1',
          title: 'Open panel (1)',
          renderAs: 'panelOpener',
          href: '/app/kibana',
          path: 'example_projet.group:openpanel1',
          children: [
            {
              id: 'group1',
              title: 'Group 1',
              path: 'example_projet.group:openpanel1.group1',
              children: [
                {
                  id: 'item1',
                  href: '/app/kibana',
                  path: 'example_projet.group:openpanel1.group1.item1',
                  title: 'Logs',
                  icon: 'logoObservability',
                },
                {
                  id: 'item2',
                  href: '/app/kibana',
                  path: 'example_projet.group:openpanel1.group1.item2',
                  title: 'Signals xxxxxx',
                  openInNewTab: true,
                },
                {
                  id: 'item3',
                  href: '/app/kibana',
                  path: 'example_projet.group:openpanel1.group1.item3',
                  title: 'Tracing',
                  withBadge: true, // Default to "Beta" badge
                },
              ],
            },
            {
              id: 'group2',
              path: 'example_projet.group:openpanel1.group2',
              title: 'Group 2',
              children: [
                {
                  id: 'group2:settings.logs',
                  href: '/app/kibana',
                  path: 'example_projet.group:openpanel1.group2.group2:settings.logs',
                  title: 'Logs',
                },
                {
                  id: 'group2:settings.signals',
                  href: '/app/kibana',
                  path: 'example_projet.group:openpanel1.group2.group2:settings.signals',
                  title: 'Signals',
                },
                {
                  id: 'group2:settings.tracing',
                  href: '/app/kibana',
                  path: 'example_projet.group:openpanel1.group2.group2:settings.tracing',
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
          path: 'example_projet.group.openpanel2',
          children: [
            {
              id: 'group1',
              path: 'example_projet.group.openpanel2.group1',
              title: '',
              appendHorizontalRule: true, // Add a separator after the group
              children: [
                {
                  id: 'logs',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel2.group1.logs',
                  title: 'Logs',
                },
                {
                  id: 'signals',
                  title: 'Signals',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel2.group1.signals',
                },
                {
                  id: 'tracing',
                  title: 'Tracing',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel2.group1.tracing',
                  withBadge: true, // Default to "Beta" badge
                },
              ],
            },
            {
              id: 'group2',
              path: 'example_projet.group.openpanel2.group2',
              title: '',
              children: [
                {
                  id: 'logs',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel2.group2.logs',
                  title: 'Logs',
                },
                {
                  id: 'signals',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel2.group2.signals',
                  title: 'Signals',
                },
                {
                  id: 'tracing',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel2.group2.tracing',
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
          path: 'example_projet.group.openpanel3',
          children: [
            {
              id: 'group1',
              title: '',
              path: 'example_projet.group.openpanel3.group1',
              appendHorizontalRule: true,
              children: [
                {
                  id: 'logs',
                  title: 'Logs',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel3.group1.logs',
                },
                {
                  id: 'signals',
                  title: 'Signals',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel3.group1.signals',
                },
                {
                  id: 'tracing',
                  title: 'Tracing',
                  withBadge: true, // Default to "Beta" badge
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel3.group1.tracing',
                },
              ],
            },
            // Groups with accordion
            {
              id: 'group2',
              title: 'MANAGEMENT',
              renderAs: 'accordion',
              path: 'example_projet.group.openpanel3.group2',
              children: [
                {
                  id: 'group2-A',
                  title: 'Group 1',
                  path: 'example_projet.group.openpanel3.group2.group2-A',
                  children: [
                    {
                      id: 'logs',
                      title: 'Logs',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-A.logs',
                    },
                    {
                      id: 'signals',
                      title: 'Signals',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-A.signals',
                    },
                    {
                      id: 'tracing',
                      title: 'Tracing',
                      withBadge: true, // Default to "Beta" badge
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-A.tracing',
                    },
                  ],
                },
                {
                  id: 'group2-B',
                  title: 'Group 2 (marked as collapsible)',
                  renderAs: 'accordion',
                  path: 'example_projet.group.openpanel3.group2.group2-B',
                  children: [
                    {
                      id: 'logs',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-B.logs',
                      title: 'Logs',
                    },
                    {
                      id: 'signals',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-B.signals',
                      title: 'Signals',
                    },
                    {
                      id: 'tracing',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-B.tracing',
                      title: 'Tracing',
                    },
                  ],
                },
                {
                  id: 'group2-C',
                  title: 'Group 3',
                  path: 'example_projet.group.openpanel3.group2.group2-C',
                  children: [
                    {
                      id: 'logs',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-C.logs',
                      title: 'Logs',
                    },
                    {
                      id: 'signals',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-C.signals',
                      title: 'Signals',
                    },
                    {
                      id: 'tracing',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel3.group2.group2-C.tracing',
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
          path: 'example_projet.group.openpanel4',
          children: [
            {
              id: 'root',
              path: 'example_projet.group.openpanel4.root',
              title: '',
              children: [
                {
                  id: 'groupAsItem1',
                  title: 'Group renders as "item" (1)',
                  renderAs: 'item',
                  path: 'example_projet.group.openpanel4.root.groupAsItem1',
                  children: [
                    {
                      id: 'logs',
                      title: 'Logs',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.root.groupAsItem1.logs',
                    },
                    {
                      id: 'signals',
                      title: 'Signals',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.root.groupAsItem1.signals',
                    },
                  ],
                },
                {
                  id: 'logs',
                  title: 'Item 2',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel4.root.logs',
                },
                {
                  id: 'logs2',
                  title: 'Item should NOT appear!', // Should not appear
                  sideNavStatus: 'hidden',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel4.root.logs2',
                },
                {
                  title: 'Group should NOT appear!',
                  id: 'logs3',
                  sideNavStatus: 'hidden', // This group should not appear
                  path: 'example_projet.group.openpanel4.root.logs3',
                  children: [
                    {
                      id: 'logs',
                      title: 'Logs',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.root.logs3.logs',
                    },
                    {
                      id: 'signals',
                      title: 'Signals',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.root.logs3.signals',
                    },
                  ],
                },
                {
                  title: 'Group renders as "item" (2)',
                  id: 'group2.renderAsItem',
                  renderAs: 'item',
                  path: 'example_projet.group.openpanel4.root.group2.renderAsItem',
                  children: [
                    {
                      id: 'logs',
                      title: 'Logs',
                      sideNavStatus: 'hidden',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.root.group2.renderAsItem.logs',
                    },
                    {
                      id: 'signals',
                      title: 'Signals',
                      sideNavStatus: 'hidden',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.root.group2.renderAsItem.signals',
                    },
                    {
                      id: 'tracing',
                      title: 'Tracing',
                      sideNavStatus: 'hidden',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.root.group2.renderAsItem.tracing',
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
              path: 'example_projet.group.openpanel4.group2',
              children: [
                {
                  id: 'group2-A',
                  title: 'Group 1',
                  path: 'example_projet.group.openpanel4.group2.group2-A',
                  children: [
                    {
                      id: 'logs',
                      title: 'Logs',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.group2.group2-A.logs',
                    },
                    {
                      id: 'signals',
                      title: 'Signals',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.group2.group2-A.signals',
                    },
                    {
                      id: 'tracing',
                      title: 'Tracing',
                      withBadge: true, // Default to "Beta" badge
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.group2.group2-A.tracing',
                    },
                  ],
                },
                {
                  id: 'root-groupB',
                  path: 'example_projet.group.openpanel4.group2.root-groupB',
                  title: '',
                  children: [
                    {
                      id: 'group2-B',
                      title: 'Group renders as "item" (3)',
                      renderAs: 'item', // This group renders as a normal item
                      path: 'example_projet.group.openpanel4.group2.root-groupB.group2-B',
                      children: [
                        {
                          id: 'logs',
                          title: 'Logs',
                          href: '/app/kibana',
                          path: 'example_projet.group.openpanel4.group2.root-groupB.group2-B.logs',
                        },
                        {
                          id: 'signals',
                          title: 'Signals',
                          href: '/app/kibana',
                          path: 'example_projet.group.openpanel4.group2.root-groupB.group2-B.signals',
                        },
                        {
                          id: 'tracing',
                          title: 'Tracing',
                          href: '/app/kibana',
                          path: 'example_projet.group.openpanel4.group2.root-groupB.group2-B.tracing',
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'group2-C',
                  title: 'Group 3',
                  path: 'example_projet.group.openpanel4.group2.group2-C',
                  children: [
                    {
                      id: 'logs',
                      title: 'Logs',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.group2.group2-C.logs',
                    },
                    {
                      id: 'groupAsItem',
                      title: 'Yet another group as item',
                      renderAs: 'item',
                      path: 'example_projet.group.openpanel4.group2.group2-C.groupAsItem',
                      children: [
                        {
                          id: 'logs',
                          title: 'Logs',
                          href: '/app/kibana',
                          path: 'example_projet.group.openpanel4.group2.group2-C.groupAsItem.logs',
                        },
                        {
                          id: 'signals',
                          title: 'Signals',
                          href: '/app/kibana',
                          path: 'example_projet.group.openpanel4.group2.group2-C.groupAsItem.signals',
                        },
                      ],
                    },
                    {
                      id: 'signals',
                      title: 'Signals',
                      href: '/app/kibana',
                      path: 'example_projet.group.openpanel4.group2.group2-C.signals',
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
          path: 'example_projet.group.openpanel5',
          children: [
            {
              id: 'test1',
              title: 'Test 1',
              sideNavStatus: 'hidden',
              href: '/app/kibana',
              path: 'example_projet.group.openpanel5.test1',
            },
            {
              id: 'test2',
              title: 'Some group',
              path: '',
              children: [
                {
                  id: 'item1',
                  title: 'My first group item',
                  sideNavStatus: 'hidden',
                  href: '/app/kibana',
                  path: 'example_projet.group.openpanel5.test2.item1',
                },
              ],
            },
          ],
        },
        {
          id: 'group.openpanel6',
          title: 'Open panel (custom content)',
          renderAs: 'panelOpener',
          path: 'example_projet.group.openpanel6',
          children: [
            {
              id: 'logs',
              title: 'Logs',
              href: '/app/kibana',
              path: 'example_projet.group.openpanel6.logs',
            },
            {
              id: 'signals',
              title: 'Signals',
              href: '/app/kibana',
              path: 'example_projet.group.openpanel6.signals',
            },
            {
              id: 'tracing',
              title: 'Tracing',
              href: '/app/kibana',
              path: 'example_projet.group.openpanel6.tracing',
            },
          ],
        },
        {
          id: 'group.openpanel7',
          title: 'Open panel (custom title)',
          renderAs: 'panelOpener',
          path: 'example_projet.group.openpanel7',
          children: [
            {
              id: 'logs',
              title: 'Those links',
              href: '/app/kibana',
              path: 'example_projet.group.openpanel7.logs',
            },
            {
              id: 'signals',
              title: 'are automatically',
              href: '/app/kibana',
              path: 'example_projet.group.openpanel7.signals',
            },
            {
              id: 'tracing',
              title: 'generated',
              href: '/app/kibana',
              path: 'example_projet.group.openpanel7.tracing',
            },
          ],
        },
      ],
    },
  ],
};

export const ObjectDefinitionWithPanel = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    recentlyAccessed$: of([
      { label: 'This is an example', link: '/app/example/39859', id: '39850' },
      { label: 'Another example', link: '/app/example/5235', id: '5235' },
    ]),
  });

  return (
    <NavigationWrapper>
      {({ isCollapsed }) => (
        <NavigationProvider {...services} isSideNavCollapsed={isCollapsed}>
          <Navigation
            navigationTree$={of(navigationTreeWithPanels)}
            panelContentProvider={panelContentProvider}
          />
        </NavigationProvider>
      )}
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
  component: ComplexObjectDefinition,
} as ComponentMeta<typeof ComplexObjectDefinition>;
