/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { NavigationStorybookMock } from '../mocks';
import mdx from '../README.mdx';
import { NavigationProps, NavigationServices } from '../types';
import { Navigation as Component } from './navigation';
import { NavigationProvider } from './services';

const mock = new NavigationStorybookMock();

const Template = (args: NavigationProps & NavigationServices) => (
  <NavigationProvider {...mock.getServices(args)}>
    <Component {...mock.getProps(args)} />
  </NavigationProvider>
);

export default {
  title: 'Chrome/Navigation',
  description:
    'An accordion-like component that renders a nested array of navigation items that use Locator information.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  component: Template,
} as ComponentMeta<typeof Template>;

export const SingleExpanded: ComponentStory<typeof Template> = Template.bind({});
SingleExpanded.args = {
  initiallyOpenSections: ['example_project'],
};
SingleExpanded.argTypes = mock.getArgumentTypes();

export const ReducedSections: ComponentStory<typeof Template> = Template.bind({});
ReducedSections.args = {
  sections: {
    analytics: { enabled: false },
    ml: { enabled: false },
    management: { enabled: false },
    devTools: { enabled: false },
  },
};
ReducedSections.argTypes = mock.getArgumentTypes();

export const WithRecentItems: ComponentStory<typeof Template> = Template.bind({});
WithRecentItems.args = {
  initiallyOpenSections: ['example_project'],
  recentItems: [
    { id: 'recent_1', label: 'The Elder Scrolls: Morrowind', link: 'testo' },
    { id: 'recent_1', label: 'TIE Fighter', link: 'testo' },
    { id: 'recent_1', label: 'Quake II', link: 'testo' },
  ],
};
WithRecentItems.argTypes = mock.getArgumentTypes();
