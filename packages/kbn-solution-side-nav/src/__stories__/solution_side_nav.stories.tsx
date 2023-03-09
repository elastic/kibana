/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { SolutionNav } from '@kbn/shared-ux-page-solution-nav';
import readme from '../../README.mdx';
import { SolutionSideNav } from '..';
import type { SolutionSideNavItem } from '../types';

const items: SolutionSideNavItem[] = [
  {
    id: 'link1',
    label: 'Single link',
    href: '#',
  },
  {
    id: 'link2',
    label: 'I have a simple panel',
    href: '#',
    items: [
      {
        id: 'link3',
        label: 'I am the first nested',
        href: '#',
        description: 'This is the first nested link',
      },
      {
        id: 'link4',
        label: 'I am the second nested',
        href: '#',
        description: 'This is the second nested link',
      },
      {
        id: 'linkBeta',
        label: 'I am beta',
        href: '#',
        description: 'This is a beta project',
        isBeta: true,
      },
      {
        id: 'linkTechnicalPreview',
        label: 'I am preview',
        href: '#',
        description: 'This is a technical preview functionality',
        isBeta: true,
        betaOptions: {
          text: 'Technical Preview',
        },
      },
    ],
  },
  {
    id: 'link5',
    label: 'I have categories',
    href: '#',
    categories: [
      { label: 'First Category', linkIds: ['link6', 'link8'] },
      { label: 'Second Category', linkIds: ['link7', 'link9'] },
    ],
    items: [
      {
        id: 'link6',
        label: 'First Category first nested',
        href: '#',
        description: 'This is the first nested link of the first category',
      },
      {
        id: 'link7',
        label: 'Second Category first nested',
        href: '#',
        description: 'This is the first nested link of the second category',
      },
      {
        id: 'link8',
        label: 'First Category second nested',
        href: '#',
        description: 'This is the second nested link of the first category',
      },
      {
        id: 'link9',
        label: 'First Category first nested',
        href: '#',
        description: 'This is the second nested link of the second category',
      },
    ],
  },
  { id: 'linkSelected', label: 'I am the selected one', href: '#' },
  { id: 'linkTruncated', href: '#', label: 'I have truncated text because I am too long' },
  { id: 'linkSmall', href: '#', label: 'I am smaller', labelSize: 'xs' },
];
const footerItems: SolutionSideNavItem[] = [
  { id: 'footerItem1', href: '#', label: 'I am a footer item' },
  { id: 'footerItem2', href: '#', label: 'I have a separator', appendSeparator: true },
  { id: 'footerItem3', href: '#', label: 'I have an icon', iconType: 'heart' },
];

const selectedId = 'linkSelected';

export const Template = ({}: {}) => (
  <SolutionNav
    name={'Security'}
    icon={'logoSecurity'}
    isOpenOnDesktop={true}
    children={
      <SolutionSideNav
        items={items}
        footerItems={footerItems}
        selectedId={selectedId}
        panelTopOffset="0"
      />
    }
  />
);

export default {
  title: 'SolutionSideNav',
  description: 'An panel oriented component that renders a nested array of navigation items.',
  parameters: {
    docs: {
      page: readme,
    },
  },
  decorators: [
    (storyFn: Function) => (
      <div
        css={{
          height: '100vh',
        }}
      >
        {storyFn()}
      </div>
    ),
  ],
  component: Template,
};
