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
import type { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

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
import { NavigationStorybookMock } from '../../../mocks';
import mdx from '../../../README.mdx';
import { NavigationProvider } from '../../services';
import { DefaultNavigation } from './default_navigation';
import type { ChromeNavigationViewModel, NavigationServices } from '../../../types';
import { Navigation } from './components';

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

const navTree: ChromeProjectNavigationNode[] = [
  {
    id: 'group1',
    title: 'Group 1',
    children: [
      {
        id: 'item1',
        title: 'Group 1: Item 1',
        link: 'group1:item1',
      },
      {
        id: 'groupA',
        link: 'group1:groupA',
        children: [
          {
            id: 'item1',
            title: 'Group 1 > Group A > Item 1',
          },
          {
            id: 'groupI',
            title: 'Group 1 : Group A : Group I',
            children: [
              {
                id: 'item1',
                title: 'Group 1 > Group A > Group 1 > Item 1',
                link: 'group1:groupA:groupI:item1',
              },
              {
                id: 'item2',
                title: 'Group 1 > Group A > Group 1 > Item 2',
              },
            ],
          },
          {
            id: 'item2',
            title: 'Group 1 > Group A > Item 2',
          },
        ],
      },
      {
        id: 'item3',
        title: 'Group 1: Item 3',
      },
    ],
  },
  {
    id: 'group2',
    link: 'group2',
    title: 'Group 2',
    children: [
      {
        id: 'item1',
        title: 'Group 2: Item 1',
        link: 'group2:item1',
      },
      {
        id: 'item2',
        title: 'Group 2: Item 2',
        link: 'group2:item2',
      },
      {
        id: 'item3',
        title: 'Group 2: Item 3',
        link: 'group2:item3',
      },
    ],
  },
  {
    id: 'item1',
    link: 'item1',
  },
  {
    id: 'item2',
    title: 'Item 2',
    link: 'bad',
  },
  {
    id: 'item3',
    title: "I don't have a 'link' prop",
  },
  {
    id: 'item4',
    title: 'Item 4',
  },
];

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

export const FromObjectConfig = (args: ChromeNavigationViewModel & NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    navLinks$: of(deepLinks),
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
  });

  return (
    <NavigationProvider {...services}>
      <DefaultNavigation homeRef="/" navTree={navTree} />
    </NavigationProvider>
  );
};

export const FromReactNodes = (args: ChromeNavigationViewModel & NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    navLinks$: of(deepLinks),
    onProjectNavigationChange: (updated) => {
      action('Update chrome navigation')(JSON.stringify(updated, null, 2));
    },
  });

  return (
    <NavigationProvider {...services}>
      <Navigation homeRef="/">
        <Navigation.Item link="item1" />
        <Navigation.Item link="unknown" title="This should not appear" />
        <Navigation.Group id="group1" title="My group">
          <Navigation.Item id="item1" title="Item 1" />
          <Navigation.Item link="item2" title="Item 2 - override deeplink title" />
          <Navigation.Item id="item3" title="Item 3" />
        </Navigation.Group>
        <Navigation.Item id="itemLast">Title from react node</Navigation.Item>
      </Navigation>
    </NavigationProvider>
  );
};

export const DefaultUI = (args: ChromeNavigationViewModel & NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    navLinks$: of(deepLinks),
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
        <Navigation homeRef="/">
          <Navigation.CloudLink preset="deployments" />

          <Navigation.RecentlyAccessed />

          <Navigation.Group
            id="example_projet"
            title="Example project"
            icon="logoObservability"
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
            </Navigation.Group>
          </Navigation.Group>

          <Navigation.Bucket preset="analytics" defaultIsCollapsed={false} />
          <Navigation.Bucket preset="ml" />

          <Navigation.Footer>
            <Navigation.Bucket preset="devtools" />
            <Navigation.Bucket preset="management" />
          </Navigation.Footer>
        </Navigation>
      </NavigationProvider>
    </NavigationWrapper>
  );
};

export const MinimalUICustomCloudLink = (args: ChromeNavigationViewModel & NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    navLinks$: of(deepLinks),
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
        <Navigation homeRef="/">
          <Navigation.CloudLink
            title="Some other cool page"
            href="https://elastic.co"
            icon="spaces"
          />

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

export const CreativeUI = (args: ChromeNavigationViewModel & NavigationServices) => {
  const services = storybookMock.getServices({
    ...args,
    navLinks$: of(deepLinks),
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
        <Navigation homeRef="/" unstyled>
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
          <Navigation.CloudLink preset="deployments" />
        </Navigation>
      </NavigationProvider>
    </NavigationWrapper>
  );
};

export default {
  title: 'Chrome/Navigation/v2',
  description: 'Navigation container to render items for cross-app linking',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  component: FromObjectConfig,
} as ComponentMeta<typeof FromObjectConfig>;
