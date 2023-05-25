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
import { css } from '@emotion/react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import React, { useCallback, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { getSolutionPropertiesMock, NavigationStorybookMock } from '../../mocks';
import mdx from '../../README.mdx';
import { ChromeNavigationViewModel, NavigationServices } from '../../types';
import { Platform } from '../model';
import { NavigationProvider } from '../services';
import { Navigation as Component } from './navigation';

const storybookMock = new NavigationStorybookMock();

const SIZE_OPEN = 248;
const SIZE_CLOSED = 40;

const Template = (args: ChromeNavigationViewModel & NavigationServices) => {
  const services = storybookMock.getServices(args);
  const props = storybookMock.getProps(args);

  const [isOpen, setIsOpen] = useState(true);

  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen, setIsOpen]);

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
        {isOpen && (
          <NavigationProvider {...services}>
            <Component {...props} />
          </NavigationProvider>
        )}
      </EuiCollapsibleNav>
    </EuiThemeProvider>
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
  navigationTree: [getSolutionPropertiesMock()],
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
  navigationTree: [getSolutionPropertiesMock()],
};
ReducedPlatformLinks.argTypes = storybookMock.getArgumentTypes();

export const WithRequestsLoading: ComponentStory<typeof Template> = Template.bind({});
WithRequestsLoading.args = {
  activeNavItemId: 'example_project.root.get_started',
  loadingCount$: new BehaviorSubject(1),
  navigationTree: [getSolutionPropertiesMock()],
};
WithRequestsLoading.argTypes = storybookMock.getArgumentTypes();

export const WithRecentlyAccessed: ComponentStory<typeof Template> = Template.bind({});
WithRecentlyAccessed.args = {
  activeNavItemId: 'example_project.root.get_started',
  loadingCount$: new BehaviorSubject(0),
  recentlyAccessed$: new BehaviorSubject([
    { label: 'This is an example', link: '/app/example/39859', id: '39850' },
    { label: 'This is not an example', link: '/app/non-example/39458', id: '39458' }, // NOTE: this will be filtered out
  ]),
  recentlyAccessedFilter: (items) =>
    items.filter((item) => item.link.indexOf('/app/example') === 0),
  navigationTree: [getSolutionPropertiesMock()],
};
WithRecentlyAccessed.argTypes = storybookMock.getArgumentTypes();

export const CustomElements: ComponentStory<typeof Template> = Template.bind({});
CustomElements.args = {
  activeNavItemId: 'example_project.custom',
  navigationTree: [
    {
      ...getSolutionPropertiesMock(),
      items: [
        {
          title: (
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
