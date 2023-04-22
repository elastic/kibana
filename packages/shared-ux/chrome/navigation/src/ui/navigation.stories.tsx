/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCollapsibleNav,
  EuiPopover,
  EuiThemeProvider,
} from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { getSolutionPropertiesMock, NavigationStorybookMock } from '../../mocks';
import mdx from '../../README.mdx';
import { NavigationProps, NavigationServices } from '../../types';
import { Platform } from '../model';
import { NavigationProvider } from '../services';
import { Navigation as Component } from './navigation';

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
  description: 'Navigation container to render items for cross-app linking',
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
  solutions: [getSolutionPropertiesMock()],
};
SingleExpanded.argTypes = storybookMock.getArgumentTypes();

export const ReducedPlatformLinks: ComponentStory<typeof Template> = Template.bind({});
ReducedPlatformLinks.args = {
  activeNavItemId: 'example_project.root.get_started',
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
  solutions: [getSolutionPropertiesMock()],
};
ReducedPlatformLinks.argTypes = storybookMock.getArgumentTypes();

export const WithRecentItems: ComponentStory<typeof Template> = Template.bind({});
WithRecentItems.args = {
  activeNavItemId: 'example_project.root.get_started',
  recentItems: [{ id: 'recent_1', label: 'This is a test recent link', link: 'testo' }],
  solutions: [getSolutionPropertiesMock()],
};
WithRecentItems.argTypes = storybookMock.getArgumentTypes();

export const WithRequestsLoading: ComponentStory<typeof Template> = Template.bind({});
WithRequestsLoading.args = {
  activeNavItemId: 'example_project.root.get_started',
  loadingCount: 1,
  solutions: [getSolutionPropertiesMock()],
};
WithRequestsLoading.argTypes = storybookMock.getArgumentTypes();

export const CustomElements: ComponentStory<typeof Template> = Template.bind({});
CustomElements.args = {
  activeNavItemId: 'example_project.custom',
  solutions: [
    {
      ...getSolutionPropertiesMock(),
      items: [
        {
          name: (
            <EuiPopover
              button={
                <EuiButtonEmpty iconType="spaces" iconSide="right">
                  Custom element
                </EuiButtonEmpty>
              }
              isOpen={true}
              anchorPosition="rightCenter"
            >
              Cool popover content
            </EuiPopover>
          ),
          id: 'custom',
        },
      ],
    },
  ],
};
CustomElements.argTypes = storybookMock.getArgumentTypes();

export const Collapsed: ComponentStory<typeof Template> = Template.bind({});
Collapsed.args = {
  activeNavItemId: 'example_project.root.get_started',
  navIsOpen: false,
  solutions: [getSolutionPropertiesMock()],
};
Collapsed.argTypes = storybookMock.getArgumentTypes();
