/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { Global, css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme, UseEuiTheme } from '@elastic/eui';
import { ChromeLayout, ChromeLayoutConfigProvider } from '@kbn/core-chrome-layout-components';
import { Box } from '@kbn/core-chrome-layout-components/__stories__/box';

import { Navigation } from '../components/navigation';
import { LOGO, PRIMARY_MENU_ITEMS, PRIMARY_MENU_FOOTER_ITEMS } from '../constants/observability';
import { NavigationStructure } from '../../types';

const styles = ({ euiTheme }: UseEuiTheme) => css`
  body {
    background-color: ${euiTheme.colors.backgroundBasePlain};
  }

  #storybook-root {
    display: flex;
  }

  div.side-nav,
  div.side_panel {
    height: 100vh;
  }
`;

interface StoryArgs {
  isCollapsed: boolean;
  logoLabel: string;
  logoType: string;
  items: NavigationStructure;
}

type PropsAndArgs = React.ComponentProps<typeof Navigation> & StoryArgs;

export default {
  title: 'Chrome/Navigation',
  component: Navigation,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isCollapsed: false,
    logoLabel: LOGO.label,
    logoType: LOGO.logoType,
    items: {
      primaryItems: PRIMARY_MENU_ITEMS,
      footerItems: PRIMARY_MENU_FOOTER_ITEMS,
    },
    setWidth: () => {},
  },
  argTypes: {
    isCollapsed: {
      control: 'boolean',
      description: 'Whether the navigation is collapsed',
    },
    logoLabel: {
      control: 'text',
      description: 'Logo label text',
    },
    logoType: {
      control: 'text',
      description: 'Logo type for EUI icon',
    },
  },
} as Meta<PropsAndArgs>;

export const Default: StoryObj<PropsAndArgs> = {
  name: 'Default Navigation',
  decorators: [
    (Story) => {
      return (
        <>
          <Global styles={styles} />
          <Story />
        </>
      );
    },
  ],
};

export const Collapsed: StoryObj<PropsAndArgs> = {
  name: 'Collapsed Navigation',
  decorators: [
    (Story) => {
      return (
        <>
          <Global styles={styles} />
          <Story />
        </>
      );
    },
  ],
  args: {
    isCollapsed: true,
  },
};

export const WithMinimalItems: StoryObj<PropsAndArgs> = {
  name: 'Navigation with Minimal Items',
  decorators: [
    (Story) => {
      return (
        <>
          <Global styles={styles} />
          <Story />
        </>
      );
    },
  ],
  args: {
    items: {
      primaryItems: PRIMARY_MENU_ITEMS.slice(0, 3),
      footerItems: PRIMARY_MENU_FOOTER_ITEMS.slice(0, 2),
    },
  },
};

export const WithManyItems: StoryObj<PropsAndArgs> = {
  name: 'Navigation with Many Items',
  decorators: [
    (Story) => {
      return (
        <>
          <Global styles={styles} />
          <Story />
        </>
      );
    },
  ],
  args: {
    items: {
      primaryItems: [
        ...PRIMARY_MENU_ITEMS,
        {
          id: 'extra_item_1',
          label: 'Extra Item 1',
          iconType: 'gear',
          href: '/extra-1',
        },
        {
          id: 'extra_item_2',
          label: 'Extra Item 2',
          iconType: 'stats',
          href: '/extra-2',
        },
        {
          id: 'extra_item_3',
          label: 'Extra Item 3',
          iconType: 'help',
          href: '/extra-3',
        },
      ],
      footerItems: PRIMARY_MENU_FOOTER_ITEMS,
    },
  },
};

const Layout = ({ ...props }: PropsAndArgs) => {
  const { euiTheme } = useEuiTheme();
  const [navigationWidth, setNavigationWidth] = useState(0);

  const headerHeight = 48;

  return (
    <>
      <ChromeLayoutConfigProvider
        value={{
          bannerHeight: 48,
          footerHeight: 48,
          headerHeight,
          navigationWidth,
          sidebarPanelWidth: 368,
          sidebarWidth: 48,
          applicationTopBarHeight: 48,
          applicationBottomBarHeight: 48,
        }}
      >
        <ChromeLayout
          banner={
            <Box
              color={euiTheme.colors.danger}
              backgroundColor={euiTheme.colors.textDanger}
              label="Global Banner"
            />
          }
          footer={
            <Box
              color={euiTheme.colors.danger}
              backgroundColor={euiTheme.colors.textDanger}
              label="Global Footer"
            />
          }
          header={
            <Box
              label="Global Header"
              color={euiTheme.colors.textParagraph}
              backgroundColor={euiTheme.colors.backgroundFilledText}
            />
          }
          navigation={
            <Navigation
              isCollapsed={props.isCollapsed}
              items={props.items}
              logoLabel={props.logoLabel}
              logoType={props.logoType}
              setWidth={setNavigationWidth}
            />
          }
          sidebar={
            <Box
              label="Global Sidebar"
              color={euiTheme.colors.accentSecondary}
              backgroundColor={euiTheme.colors.textAccentSecondary}
              labelCSS={css`
                transform: translate(-50%, -50%) rotate(90deg);
              `}
            />
          }
          sidebarPanel={
            <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%' }}>
              <EuiFlexItem
                grow={false}
                style={{ height: headerHeight }}
                css={css`
                  white-space: nowrap;
                `}
              >
                <Box
                  label="Sidebar Header"
                  color={euiTheme.colors.accentSecondary}
                  backgroundColor={euiTheme.colors.textAccentSecondary}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <Box
                  label="Sidebar Panel"
                  color={euiTheme.colors.accentSecondary}
                  backgroundColor={euiTheme.colors.textAccentSecondary}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          applicationTopBar={
            <Box
              label="AppBar"
              color={euiTheme.colors.text}
              backgroundColor={euiTheme.colors.success}
            />
          }
          applicationBottomBar={
            <Box
              label="BottomBar"
              color={euiTheme.colors.text}
              backgroundColor={euiTheme.colors.accent}
            />
          }
        >
          <Box
            label="Application"
            color={euiTheme.colors.textWarning}
            backgroundColor={euiTheme.colors.warning}
            rootCSS={css`
              /* demo to make the application area scrollable */
              height: 1000px;
            `}
          />
        </ChromeLayout>
      </ChromeLayoutConfigProvider>
    </>
  );
};

export const WithinLayout: StoryObj<PropsAndArgs> = {
  name: 'Navigation within Layout',
  render: (args) => <Layout {...args} />,
};
