/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { Global, css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { ChromeLayout, ChromeLayoutConfigProvider } from '..';
import { LayoutDebugOverlay } from '../debug/layout_debug_overlay';
import { Box } from './box';

const styles = css`
  body.sb-show-main.sb-main-padded {
    padding: 0;
    overflow-x: hidden;
    min-width: 100%;
    min-height: 100%;
  }
`;

interface StoryArgs {
  debug: boolean;
  bannerHeight: number;
  footerHeight: number;
  headerHeight: number;
  navigationWidth: number;
  sidebarPanelWidth: number;
  sidebarWidth: number;
  applicationTopBarHeight: number;
  applicationBottomBarHeight: number;
  includeSidebar: boolean;
  includeSidebarPanel: boolean;
  includeBanner: boolean;
  includeFooter: boolean;
  includeNavigation: boolean;
  includeHeader: boolean;
  includeApplicationTopBar: boolean;
  includeApplicationBottomBar: boolean;
}

type PropsAndArgs = React.ComponentProps<typeof ChromeLayout> & StoryArgs;

export default {
  title: 'Chrome/Layout',
  description: 'Chrome Layout',
  parameters: {},
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
} as Meta<PropsAndArgs>;

const LayoutExample = ({
  debug,
  includeBanner,
  includeFooter,
  includeSidebar,
  includeSidebarPanel,
  includeNavigation,
  includeHeader,
  includeApplicationBottomBar,
  includeApplicationTopBar,
  ...props
}: StoryArgs) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  return (
    <>
      {debug && <LayoutDebugOverlay />}
      <ChromeLayoutConfigProvider value={{ ...props }}>
        <ChromeLayout
          banner={
            includeBanner ? (
              <Box
                color={colors.danger}
                backgroundColor={colors.textDanger}
                label="Global Banner"
              />
            ) : null
          }
          footer={
            includeFooter ? (
              <Box
                color={colors.danger}
                backgroundColor={colors.textDanger}
                label="Global Footer"
              />
            ) : null
          }
          header={
            includeHeader ? (
              <Box
                label="Global Header"
                color={colors.textParagraph}
                backgroundColor={colors.backgroundFilledText}
              />
            ) : null
          }
          navigation={
            includeNavigation ? (
              <Box
                label="Global Navigation"
                color={colors.textPrimary}
                backgroundColor={colors.primary}
                labelCSS={css`
                  transform: translate(-50%, -50%) rotate(-90deg);
                `}
              />
            ) : null
          }
          sidebar={
            includeSidebar ? (
              <Box
                label="Global Sidebar"
                color={colors.accentSecondary}
                backgroundColor={colors.textAccentSecondary}
                labelCSS={css`
                  transform: translate(-50%, -50%) rotate(90deg);
                `}
              />
            ) : null
          }
          sidebarPanel={
            includeSidebarPanel ? (
              <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%' }}>
                <EuiFlexItem
                  grow={false}
                  style={{ height: props.headerHeight }}
                  css={css`
                    white-space: nowrap;
                  `}
                >
                  <Box
                    label="Sidebar Header"
                    color={colors.accentSecondary}
                    backgroundColor={colors.textAccentSecondary}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <Box
                    label="Sidebar Panel"
                    color={colors.accentSecondary}
                    backgroundColor={colors.textAccentSecondary}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null
          }
          applicationTopBar={
            includeApplicationTopBar && (
              <Box label="AppBar" color={colors.text} backgroundColor={colors.success} />
            )
          }
          applicationBottomBar={
            includeApplicationBottomBar && (
              <Box label="BottomBar" color={colors.text} backgroundColor={colors.accent} />
            )
          }
        >
          <Box
            label="Application"
            color={colors.textWarning}
            backgroundColor={colors.warning}
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

export const Layout: StoryObj<PropsAndArgs> = {
  args: {
    debug: false,
    includeBanner: true,
    includeFooter: true,
    includeNavigation: true,
    includeHeader: true,
    includeSidebar: true,
    includeSidebarPanel: true,
    includeApplicationBottomBar: true,
    includeApplicationTopBar: true,
    bannerHeight: 48,
    footerHeight: 48,
    headerHeight: 48,
    navigationWidth: 48,
    sidebarPanelWidth: 368,
    sidebarWidth: 48,
    applicationTopBarHeight: 48,
    applicationBottomBarHeight: 48,
  },
  argTypes: {
    debug: {
      control: 'boolean',
      description: 'Whether to include the debug overlay in the layout',
    },
    includeBanner: {
      control: 'boolean',
      description: 'Whether to include the banner in the layout',
    },
    includeFooter: {
      control: 'boolean',
      description: 'Whether to include the footer in the layout',
    },
    includeSidebar: {
      control: 'boolean',
      description: 'Whether to include the sidebar in the layout',
    },
    includeSidebarPanel: {
      control: 'boolean',
      description: 'Whether to include the sidebar panel in the layout',
    },
    includeNavigation: {
      control: 'boolean',
      description: 'Whether to include the navigation in the layout',
    },
    includeHeader: {
      control: 'boolean',
      description: 'Whether to include the header in the layout',
    },
    includeApplicationTopBar: {
      control: 'boolean',
      description: 'Whether to include the application top bar (appbar) in the layout',
    },
    includeApplicationBottomBar: {
      control: 'boolean',
      description: 'Whether to include the application bottom bar (bottombar) in the layout',
    },
    bannerHeight: { control: 'number', description: 'Height of the banner' },
    footerHeight: { control: 'number', description: 'Height of the footer' },
    headerHeight: { control: 'number', description: 'Height of the header' },
    navigationWidth: { control: 'number', description: 'Width of the navigation' },
    sidebarPanelWidth: { control: 'number', description: 'Width of the sidebar panel' },
    sidebarWidth: { control: 'number', description: 'Width of the sidebar' },
    applicationTopBarHeight: {
      control: 'number',
      description: 'Height of the application top bar (appbar)',
    },
    applicationBottomBarHeight: {
      control: 'number',
      description: 'Height of the application bottom bar (bottombar)',
    },
  },
  render: (args) => <LayoutExample {...args} />,
};
