/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ComponentMeta } from '@storybook/react';
import React from 'react';
import { of } from 'rxjs';

import type { NavigationTreeDefinitionUI } from '@kbn/core-chrome-browser';
import { NavigationWrapper, NavigationStorybookMock } from '../../mocks';
import mdx from '../../README.mdx';
import type { NavigationServices } from '../types';
import { NavigationProvider } from '../services';
import { Navigation } from './navigation';

const storybookMock = new NavigationStorybookMock();

const navigationTreeWithGroups: NavigationTreeDefinitionUI = {
  id: 'es',
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

export const Groups = (args: NavigationServices) => {
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
          <Navigation navigationTree$={of(navigationTreeWithGroups)} />
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
  component: Groups,
} as ComponentMeta<typeof Groups>;
