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
import { mocks, NavigationStorybookMock } from '../../mocks';
import mdx from '../../README.mdx';
import { NavigationProps, NavigationServices } from '../../types';
import { Platform } from '../model';
import { NavigationProvider } from '../services';
import { Navigation as Component } from './navigation';

const { locatorId, ...solutionProperties } = mocks;

const storybookMock = new NavigationStorybookMock();
let colorMode = '';
colorMode = 'LIGHT';

const Template = (args: NavigationProps & NavigationServices) => {
  const services = storybookMock.getServices(args);
  const props = storybookMock.getProps(args);

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
  activeNavItemId: 'example_project.root.get_started',
  solutions: [solutionProperties],
};
SingleExpanded.argTypes = storybookMock.getArgumentTypes();

export const ReducedPlatformLinks: ComponentStory<typeof Template> = Template.bind({});
ReducedPlatformLinks.args = {
  platformConfig: {
    [Platform.Analytics]: { enabled: false },
    [Platform.MachineLearning]: { enabled: false },
    [Platform.DevTools]: { enabled: false },
    [Platform.Management]: {
      properties: {
        root: {
          enabled: false, // disables the un-named section that contains only "Stack Monitoring"
        },
        integration_management: {
          properties: {
            integrations: { enabled: false }, // enable only osquery
            fleet: { enabled: false }, // enable only osquery
          },
        },
        stack_management: {
          enabled: false, // disables the stack management section
        },
      },
    },
  },
  solutions: [solutionProperties],
};
ReducedPlatformLinks.argTypes = storybookMock.getArgumentTypes();

export const WithRecentItems: ComponentStory<typeof Template> = Template.bind({});
WithRecentItems.args = {
  recentItems: [{ id: 'recent_1', label: 'This is a test recent link', link: 'testo' }],
  solutions: [solutionProperties],
};
WithRecentItems.argTypes = storybookMock.getArgumentTypes();

export const WithRequestsLoading: ComponentStory<typeof Template> = Template.bind({});
WithRequestsLoading.args = {
  loadingCount: 1,
  solutions: [solutionProperties],
};
WithRequestsLoading.argTypes = storybookMock.getArgumentTypes();

export const Collapsed: ComponentStory<typeof Template> = Template.bind({});
Collapsed.args = {
  navIsOpen: false,
  solutions: [solutionProperties],
};
Collapsed.argTypes = storybookMock.getArgumentTypes();
