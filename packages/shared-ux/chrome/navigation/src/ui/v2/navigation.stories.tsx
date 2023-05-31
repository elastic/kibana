/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { of } from 'rxjs';
import { ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import { NavigationStorybookMock } from '../../../mocks';
import mdx from '../../../README.mdx';
import { NavigationProvider } from '../../services';
import { DefaultNavigation } from './default_navigation';
import type { ChromeNavigationViewModel, NavigationServices } from '../../../types';
import { Navigation } from './components';

const storybookMock = new NavigationStorybookMock();

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
      <DefaultNavigation navTree={navTree} />
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
      <Navigation>
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
