/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useState } from 'react';
import { of } from 'rxjs';
import { ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCollapsibleNav,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { NavigationStorybookMock, navLinksMock } from '../../mocks';
import mdx from '../../README.mdx';
import { NavigationProvider } from '../services';
import { DefaultNavigation } from './default_navigation';
import type { NavigationServices } from '../../types';
import { Navigation } from './components';
import type { NonEmptyArray, ProjectNavigationDefinition } from './types';
import { getPresets } from './nav_tree_presets';

const storybookMock = new NavigationStorybookMock();

const SIZE_OPEN = 248;
const SIZE_CLOSED = 40;

const NavigationWrapper: FC = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);

  const collabsibleNavCSS = css`
    border-inline-end-width: 1,
    display: flex,
    flex-direction: row,
  `;

  const CollapseButton = () => {
    const buttonCSS = css`
      margin-left: -32px;
      position: fixed;
      z-index: 1000;
    `;
    return (
      <span css={buttonCSS}>
        <EuiButtonIcon
          iconType={isOpen ? 'menuLeft' : 'menuRight'}
          color={isOpen ? 'ghost' : 'text'}
          onClick={toggleOpen}
          aria-label={isOpen ? 'Collapse navigation' : 'Expand navigation'}
        />
      </span>
    );
  };

  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

  return (
    <EuiThemeProvider>
      <EuiCollapsibleNav
        css={collabsibleNavCSS}
        isOpen={true}
        showButtonIfDocked={true}
        onClose={toggleOpen}
        isDocked={true}
        size={isOpen ? SIZE_OPEN : SIZE_CLOSED}
        hideCloseButton={false}
        button={<CollapseButton />}
      >
        {isOpen && children}
      </EuiCollapsibleNav>
    </EuiThemeProvider>
  );
};

const baseDeeplink: ChromeNavLink = {
  id: 'foo',
  title: 'Title from deep link',
  href: 'https://elastic.co',
  url: '',
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
  createDeepLink('group1:item1'),
  createDeepLink('group1:groupA:groupI:item1'),
  createDeepLink('group1:groupA', 'Group title from deep link'),
  createDeepLink('group2', 'Group title from deep link'),
  createDeepLink('group2:item1'),
  createDeepLink('group2:item3'),
];

const simpleNavigationDefinition: ProjectNavigationDefinition = {
  projectNavigationTree: [
    {
      id: 'example_projet',
      title: 'Example project',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      children: [
        {
          id: 'root',
          children: [
            {
              id: 'item1',
              title: 'Get started',
            },
            {
              id: 'item2',
              title: 'Alerts',
            },
            {
              id: 'item3',
              title: 'Dashboards',
            },
            {
              id: 'item4',
              title: 'External link',
              href: 'https://elastic.co',
            },
            {
              id: 'item5',
              title: 'Another link',
            },
          ],
        },
        {
          id: 'group:settings',
          title: 'Settings',
          children: [
            {
              id: 'logs',
              title: 'Logs',
            },
            {
              id: 'signals',
              title: 'Signals',
            },
            {
              id: 'tracing',
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
    navLinks$: of([...navLinksMock, ...deepLinks]),
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

const navigationDefinition: ProjectNavigationDefinition = {
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
            id: 'root',
            children: [
              {
                id: 'item1',
                title: 'Get started',
              },
              {
                id: 'item2',
                title: 'Alerts',
              },
              {
                id: 'item3',
                title: 'Some other node',
              },
            ],
          },
          {
            id: 'group:settings',
            title: 'Settings',
            children: [
              {
                id: 'logs',
                title: 'Logs',
              },
              {
                id: 'signals',
                title: 'Signals',
              },
              {
                id: 'tracing',
                title: 'Tracing',
              },
            ],
          },
        ],
      },
      // Add ml
      {
        type: 'navGroup',
        preset: 'ml',
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
        })) as NonEmptyArray<any>,
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
    navLinks$: of([...navLinksMock, ...deepLinks]),
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

export const WithUIComponents = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    navLinks$: of([...navLinksMock, ...deepLinks]),
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
          <Navigation.RecentlyAccessed />

          <Navigation.Group
            id="example_projet"
            title="Example project"
            icon="logoObservability"
            defaultIsCollapsed={false}
          >
            <Navigation.Group id="root">
              <Navigation.Item<any> id="item1" link="item1" />
              <Navigation.Item id="item2" title="Alerts">
                {(navNode) => {
                  return (
                    <div className="euiSideNavItemButton">
                      <EuiText size="s">{`Render prop: ${navNode.id} - ${navNode.title}`}</EuiText>
                    </div>
                  );
                }}
              </Navigation.Item>
              <Navigation.Item id="item3" title="Title in ReactNode">
                <div className="euiSideNavItemButton">
                  <EuiLink>Title in ReactNode</EuiLink>
                </div>
              </Navigation.Item>
              <Navigation.Item id="item4" title="External link" href="https://elastic.co" />
            </Navigation.Group>

            <Navigation.Group id="group:settings" title="Settings">
              <Navigation.Item id="logs" title="Logs" />
              <Navigation.Item id="signals" title="Signals" />
              <Navigation.Item id="tracing" title="Tracing" />
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
              <Navigation.Group id="settings">
                <Navigation.Item link="management" title="Management" />
                <Navigation.Item id="cloudLinkUserAndRoles" cloudLink="userAndRoles" />
                <Navigation.Item id="cloudLinkPerformance" cloudLink="performance" />
                <Navigation.Item id="cloudLinkBilling" cloudLink="billingAndSub" />
              </Navigation.Group>
            </Navigation.Group>
          </Navigation.Footer>
        </Navigation>
      </NavigationProvider>
    </NavigationWrapper>
  );
};

export const MinimalUI = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    navLinks$: of([...navLinksMock, ...deepLinks]),
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

export const CreativeUI = (args: NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    navLinks$: of([...navLinksMock, ...deepLinks]),
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
        <Navigation unstyled>
          <EuiFlexGroup direction="column" css={{ backgroundColor: 'pink', height: '100%' }}>
            <EuiFlexItem grow>
              <EuiFlexGroup
                direction="column"
                gutterSize="none"
                style={{ overflowY: 'auto' }}
                justifyContent="spaceBetween"
              >
                <EuiFlexItem grow={false} css={{ padding: '12px' }}>
                  <EuiTitle>
                    <h3>Hello!</h3>
                  </EuiTitle>

                  <Navigation.Group id="myProject" title="My project" icon="logoObservability">
                    <ul css={{ margin: '1em' }}>
                      <Navigation.Item id="item1" title="Star wars movies">
                        <li
                          css={{
                            marginLeft: '20px',
                            listStyle: 'disc outside none',
                            marginBottom: '8px',
                          }}
                        >
                          <a href="/">Star wars movies</a>
                        </li>
                      </Navigation.Item>

                      <Navigation.Item id="item2" title="My library">
                        {(navNode) => {
                          return (
                            <li
                              css={{
                                marginLeft: '20px',
                                listStyle: 'disc outside none',
                                marginBottom: '8px',
                              }}
                            >
                              <a href="/">From prop -- {navNode.title}</a>
                            </li>
                          );
                        }}
                      </Navigation.Item>

                      <Navigation.Item id="item3" title="You must see this">
                        <li
                          css={{
                            marginLeft: '20px',
                            listStyle: 'disc outside none',
                            marginBottom: '8px',
                            color: 'yellow',
                            fontWeight: 700,
                          }}
                        >
                          You must see this
                        </li>
                      </Navigation.Item>
                    </ul>
                  </Navigation.Group>
                  <p>
                    <em>As you can see there is really no limit in what UI you can create!</em>
                    <br />
                  </p>
                  <p css={{ marginTop: '24px', textAlign: 'center' }}>
                    <EuiButton>Have fun!</EuiButton>
                  </p>
                </EuiFlexItem>

                <EuiFlexItem
                  grow={false}
                  css={{
                    borderTop: '2px solid yellow',
                    padding: '20px',
                    height: '160px',
                    backgroundImage: `url('https://images.unsplash.com/photo-1606041008023-472dfb5e530f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2333&q=80')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: 'white',
                  }}
                />
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Navigation>
      </NavigationProvider>
    </NavigationWrapper>
  );
};
