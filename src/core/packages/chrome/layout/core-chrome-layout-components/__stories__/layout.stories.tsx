/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { css, Global } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
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
  sidebarWidth: number;
  applicationTopBarHeight: number;
  applicationBottomBarHeight: number;
  includeSidebar: boolean;
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
    includeApplicationBottomBar: true,
    includeApplicationTopBar: true,
    bannerHeight: 48,
    footerHeight: 48,
    headerHeight: 48,
    navigationWidth: 48,
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
