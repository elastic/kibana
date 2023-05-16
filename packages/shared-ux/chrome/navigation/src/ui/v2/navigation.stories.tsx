/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentMeta } from '@storybook/react';

import { NavigationStorybookMock } from '../../../mocks';
import mdx from '../../../README.mdx';
import { NavigationProvider } from '../../services';
import { DefaultNavigation } from './default_navigation';
import type { NavigationNode } from './types';
import type { ChromeNavigationViewModel, NavigationServices } from '../../../types';

const storybookMock = new NavigationStorybookMock();

const navTree: NavigationNode[] = [
  {
    id: 'group1',
    title: 'Group 1',
    items: [
      {
        id: 'item1',
        title: 'Group 1: Item 1',
        link: 'app:home',
      },
      {
        id: 'item2',
        title: 'Group 1: Item 2',
        link: 'app2:home',
      },
      {
        id: 'item3',
        title: 'Group 1: Item 3',
        link: 'app3:home',
      },
    ],
  },
  {
    id: 'group2',
    title: 'Group 2',
    items: [
      {
        id: 'item1',
        title: 'Group 2: Item 1',
        link: 'app2:link1',
      },
      {
        id: 'item2',
        title: 'Group 2: subGroup 1',
        items: [
          {
            id: 'item1',
            title: 'Group 2: Sub 1: Item 1',
            link: 'app:link4',
          },
          {
            id: 'item2',
            title: 'Group 2: Sub 1: Item 2',
            link: 'app:link5',
          },
        ],
      },
      {
        id: 'item3',
        title: 'Group 2: Item 2',
        link: 'app2:link7',
      },
    ],
  },
  {
    id: 'group3',
    title: 'Group 3',
    items: [
      {
        id: 'item1',
        title: 'Group 3: Item 1',
        link: 'app3:link1',
      },
    ],
  },
];

const Template = (args: ChromeNavigationViewModel & NavigationServices) => {
  const services = storybookMock.getServices(args);

  return (
    <NavigationProvider {...services}>
      <DefaultNavigation navTree={navTree} />
    </NavigationProvider>
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
  component: Template,
} as ComponentMeta<typeof Template>;

export const NavigationNew = Template.bind({});
