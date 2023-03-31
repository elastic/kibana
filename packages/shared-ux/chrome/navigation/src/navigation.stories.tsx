/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonIcon, EuiCollapsibleNav, EuiThemeProvider } from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { PLATFORM_SECTIONS } from '../constants';
import { NavigationStorybookMock } from '../mocks';
import mdx from '../README.mdx';
import { NavigationProps, NavigationServices } from '../types';
import { Navigation as Component } from './navigation';
import { NavigationProvider } from './services';

const mock = new NavigationStorybookMock();
let colorMode = '';
colorMode = 'LIGHT';

const Template = (args: NavigationProps & NavigationServices) => {
  const services = mock.getServices(args);
  const props = mock.getProps(args);

  const { navIsOpen } = services;
  const collapseAction = action('setNavIsOpen');

  const setNavIsOpen = (value: boolean) => {
    collapseAction(value);
  };

  return (
    <EuiCollapsibleNav
      isOpen={navIsOpen}
      isDocked={true}
      showButtonIfDocked={true}
      hideCloseButton={true}
      size={navIsOpen ? 248 : 40}
      button={
        <EuiThemeProvider colorMode={colorMode === 'DARK' ? 'LIGHT' : 'DARK'}>
          <span
            css={{
              position: 'fixed',
              zIndex: 1000,
              ...(navIsOpen
                ? { marginLeft: -32, marginTop: 14 }
                : { marginLeft: -32, marginTop: 45 }),
            }}
          >
            <EuiButtonIcon
              iconType={navIsOpen ? 'menuLeft' : 'menuRight'}
              aria-label={navIsOpen ? 'Close navigation' : 'Open navigation'}
              color="text"
              onClick={() => {
                setNavIsOpen(!navIsOpen);
              }}
            />
          </span>
        </EuiThemeProvider>
      }
      onClose={() => {
        setNavIsOpen(false);
      }}
    >
      <NavigationProvider {...services}>
        <Component {...props} />
      </NavigationProvider>
    </EuiCollapsibleNav>
  );
};

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

export const ReducedSections: ComponentStory<typeof Template> = Template.bind({});
ReducedSections.args = {
  platformSections: {
    [PLATFORM_SECTIONS.ANALYTICS]: { enabled: false },
    [PLATFORM_SECTIONS.MACHINE_LEARNING]: { enabled: false },
    [PLATFORM_SECTIONS.DEVTOOLS]: { enabled: false },
    [PLATFORM_SECTIONS.MANAGEMENT]: { enabled: false },
  },
};
ReducedSections.argTypes = mock.getArgumentTypes();

/**
// Home button
// Spaces menu
export const WithClassicBuckets: ComponentStory<typeof Template> = Template.bind({});
WithClassicBuckets.args = {};
WithClassicBuckets.argTypes = mock.getArgumentTypes();

// With banner?
// with bottom bar?
 **/
