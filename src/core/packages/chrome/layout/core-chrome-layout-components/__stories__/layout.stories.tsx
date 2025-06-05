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
import { ChromeLayout } from '../layout';
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
  bannerHeight: number;
  footerHeight: number;
  headerHeight: number;
  navigationWidth: number;
  navigationPanelWidth: number;
  sidebarPanelWidth: number;
  sidebarWidth: number;
  includeSidebar: boolean;
  includeSidebarPanel: boolean;
  includeBanner: boolean;
  includeFooter: boolean;
  includeNavigationPanel: boolean;
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
  includeBanner,
  includeFooter,
  includeSidebar,
  includeSidebarPanel,
  includeNavigationPanel,
  ...props
}: StoryArgs) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  return (
    <ChromeLayout {...props}>
      {{
        Application: () => (
          <Box
            label="Application"
            color={colors.textWarning}
            backgroundColor={colors.warning}
            rootCSS={css`
              height: 1000px;
            `}
          />
        ),
        Banner: !includeBanner
          ? null
          : () => (
              <Box
                color={colors.danger}
                backgroundColor={colors.textDanger}
                label="Global Banner"
              />
            ),
        Header: () => (
          <Box
            label="Global Header"
            color={colors.textParagraph}
            backgroundColor={colors.backgroundFilledText}
          />
        ),
        Navigation: () => (
          <Box
            label="Navigation"
            color={colors.textPrimary}
            backgroundColor={colors.primary}
            labelCSS={css`
              transform: translate(-50%, -50%) rotate(-90deg);
            `}
          />
        ),
        NavigationPanel: !includeNavigationPanel
          ? null
          : () => (
              <EuiFlexGroup direction="column" gutterSize="none" css={{ height: '100%' }}>
                <EuiFlexItem
                  grow={false}
                  style={{ height: props.headerHeight }}
                  css={css`
                    white-space: nowrap;
                  `}
                >
                  <Box
                    label="Nav Header"
                    color={colors.textPrimary}
                    backgroundColor={colors.primary}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <Box
                    label="Navigation Panel"
                    color={colors.textPrimary}
                    backgroundColor={colors.primary}
                    labelCSS={css`
                      text-align: center;
                    `}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
        Sidebar: !includeSidebar
          ? null
          : () => (
              <Box
                label="Sidebar"
                color={colors.accentSecondary}
                backgroundColor={colors.textAccentSecondary}
                labelCSS={css`
                  transform: translate(-50%, -50%) rotate(90deg);
                `}
              />
            ),
        SidebarPanel: !includeSidebarPanel
          ? null
          : () => (
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
            ),
        Footer: !includeFooter
          ? null
          : () => <Box label="Footer" color={colors.danger} backgroundColor={colors.textDanger} />,
      }}
    </ChromeLayout>
  );
};

export const Layout: StoryObj<PropsAndArgs> = {
  args: {
    includeBanner: true,
    includeFooter: true,
    includeNavigationPanel: true,
    includeSidebar: true,
    includeSidebarPanel: true,
    bannerHeight: 48,
    footerHeight: 48,
    headerHeight: 48,
    navigationWidth: 48,
    navigationPanelWidth: 240,
    sidebarPanelWidth: 368,
    sidebarWidth: 48,
  },
  argTypes: {
    includeBanner: {
      control: 'boolean',
      description: 'Whether to include the banner in the layout',
    },
    includeFooter: {
      control: 'boolean',
      description: 'Whether to include the footer in the layout',
    },
    includeNavigationPanel: {
      control: 'boolean',
      description: 'Whether to include the navigation panel in the layout',
    },
    includeSidebar: {
      control: 'boolean',
      description: 'Whether to include the sidebar in the layout',
    },
    includeSidebarPanel: {
      control: 'boolean',
      description: 'Whether to include the sidebar panel in the layout',
    },
    bannerHeight: { control: 'number', description: 'Height of the banner' },
    footerHeight: { control: 'number', description: 'Height of the footer' },
    headerHeight: { control: 'number', description: 'Height of the header' },
    navigationWidth: { control: 'number', description: 'Width of the navigation' },
    navigationPanelWidth: { control: 'number', description: 'Width of the navigation panel' },
    sidebarPanelWidth: { control: 'number', description: 'Width of the sidebar panel' },
    sidebarWidth: { control: 'number', description: 'Width of the sidebar' },
  },
  render: (args) => <LayoutExample {...args} />,
};
