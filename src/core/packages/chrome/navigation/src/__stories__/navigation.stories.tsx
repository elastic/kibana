/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiSkipLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import { Box } from '@kbn/core-chrome-layout-components/__stories__/box';
import { ChromeLayout, ChromeLayoutConfigProvider } from '@kbn/core-chrome-layout-components';
import { css, Global } from '@emotion/react';

import { LOGO, PRIMARY_MENU_FOOTER_ITEMS, PRIMARY_MENU_ITEMS } from '../mocks/observability';
import { Navigation } from '../components/navigation';
import { usePreventLinkNavigation } from '../hooks/use_prevent_link_navigation';
import { NAVIGATION_ROOT_SELECTOR, NAVIGATION_SELECTOR_PREFIX } from '../constants';

const styles = ({ euiTheme }: UseEuiTheme) => {
  const sidePanelClassName = `${NAVIGATION_SELECTOR_PREFIX}-sidePanel`;

  return css`
    body {
      background-color: ${euiTheme.colors.backgroundBasePlain};
    }

    #storybook-root {
      display: flex;
    }

    div.${NAVIGATION_ROOT_SELECTOR}, div.${sidePanelClassName} {
      height: 100vh;
    }
  `;
};

type PropsAndArgs = ComponentProps<typeof Navigation>;

const CHROME_TOOLS: NonNullable<PropsAndArgs['tools']> = {
  headerTools: [
    {
      id: 'search',
      label: 'Search',
      iconType: 'search',
      onClick: () => {},
    },
    {
      id: 'notifications',
      label: 'Notifications',
      iconType: 'bell',
      onClick: () => {},
    },
    {
      id: 'quick_settings',
      label: 'Quick settings',
      iconType: 'gear',
      onClick: () => {},
    },
  ],
  footerTools: [
    {
      id: 'help',
      label: 'Help',
      iconType: 'question',
      sections: [
        {
          id: 'help-links',
          items: [{ id: 'documentation', label: 'Documentation', href: '/help/documentation' }],
        },
      ],
    },
  ],
};

const SpaceBadge = () => (
  <span
    css={css`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background-color: #f04e98;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
    `}
  >
    D
  </span>
);

const SPACES = [
  { id: 'default', name: 'Default', color: '#f04e98', initial: 'D' },
  { id: 'marketing', name: 'Marketing', color: '#00bfb3', initial: 'M' },
  { id: 'engineering', name: 'Engineering', color: '#6092c0', initial: 'E' },
  { id: 'sales', name: 'Sales', color: '#d6bf57', initial: 'S' },
];

const SpacePicker = ({ closePopover }: { closePopover: () => void }) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="none"
    css={css`
      padding: 12px;
    `}
  >
    <EuiFlexItem>
      <EuiText
        size="xs"
        css={css`
          font-weight: 600;
          margin-bottom: 8px;
        `}
      >
        <p>Spaces</p>
      </EuiText>
    </EuiFlexItem>
    {SPACES.map((space) => (
      <EuiFlexItem key={space.id}>
        <button
          type="button"
          onClick={closePopover}
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 4px;
            border: none;
            background: transparent;
            cursor: pointer;
            width: 100%;
            border-radius: 4px;
            &:hover {
              background: rgba(0, 0, 0, 0.05);
            }
          `}
        >
          <span
            css={css`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 18px;
              height: 18px;
              border-radius: 3px;
              background-color: ${space.color};
              color: #fff;
              font-size: 10px;
              font-weight: 700;
              flex-shrink: 0;
            `}
          >
            {space.initial}
          </span>
          <EuiText size="s">{space.name}</EuiText>
        </button>
      </EuiFlexItem>
    ))}
    <EuiFlexItem>
      <EuiHorizontalRule margin="s" />
      <EuiLink
        href="/spaces"
        onClick={(e) => {
          e.preventDefault();
          closePopover();
        }}
      >
        <EuiText size="xs">Manage spaces</EuiText>
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const CUSTOM_TOOLS: NonNullable<PropsAndArgs['tools']> = {
  headerTools: [
    {
      id: 'spaces',
      label: 'Current space',
      renderContent: () => <SpaceBadge />,
      renderPopover: (closePopover) => <SpacePicker closePopover={closePopover} />,
      popoverWidth: 360,
    },
    { id: 'search', label: 'Search', iconType: 'search', onClick: () => {} },
  ],
  footerTools: [
    {
      id: 'help',
      label: 'Help',
      iconType: 'question',
      sections: [
        {
          id: 'help-links',
          items: [{ id: 'docs', label: 'Documentation', href: '/docs' }],
        },
      ],
    },
    {
      id: 'user',
      label: 'Jane Doe',
      renderContent: () => <EuiAvatar size="s" name="Jane Doe" />,
      sections: [
        {
          id: 'account',
          items: [
            { id: 'profile', label: 'Profile', href: '/profile' },
            { id: 'preferences', label: 'Preferences', href: '/preferences' },
          ],
        },
        {
          id: 'session',
          items: [{ id: 'logout', label: 'Log out', href: '/logout' }],
        },
      ],
    },
  ],
};

const PreventLinkNavigation = (Story: StoryFn) => {
  usePreventLinkNavigation();

  return <Story />;
};

export default {
  title: 'Chrome/Navigation',
  component: Navigation,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [PreventLinkNavigation],
  args: {
    activeItemId: PRIMARY_MENU_ITEMS[0].id,
    isCollapsed: false,
    items: {
      primaryItems: PRIMARY_MENU_ITEMS,
      footerItems: PRIMARY_MENU_FOOTER_ITEMS,
    },
    logo: {
      id: 'observability',
      href: LOGO.href,
      label: LOGO.label,
      iconType: LOGO.iconType,
    },
    setWidth: () => {},
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
  render: (args) => <ControlledNavigation {...args} />,
};

export const WithTools: StoryObj<PropsAndArgs> = {
  name: 'With header and footer tools',
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
    tools: CHROME_TOOLS,
    logo: {
      id: 'observability',
      href: LOGO.href,
      label: LOGO.label,
      iconType: LOGO.iconType,
      hideLabel: true,
    },
  },
  render: (args) => <ControlledNavigation {...args} />,
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
  render: (args) => <ControlledNavigation {...args} />,
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
  render: (args) => <ControlledNavigation {...args} />,
};

export const WithCustomToolItems: StoryObj<PropsAndArgs> = {
  name: 'With custom tool items (avatar & space badge)',
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
    tools: CUSTOM_TOOLS,
    logo: {
      id: 'observability',
      href: LOGO.href,
      label: LOGO.label,
      iconType: LOGO.iconType,
      hideLabel: true,
    },
  },
  render: (args) => <ControlledNavigation {...args} />,
};

export const WithinLayout: StoryObj<PropsAndArgs> = {
  name: 'Navigation within Layout',
  render: (args) => <Layout {...args} />,
};

const ControlledNavigation = ({ ...props }: PropsAndArgs) => {
  const [activeItemId, setActiveItemId] = useState(props.activeItemId || PRIMARY_MENU_ITEMS[0].id);
  const [isCollapsed, setIsCollapsed] = useState(props.isCollapsed ?? false);

  return (
    <Navigation
      {...props}
      isCollapsed={isCollapsed}
      activeItemId={activeItemId}
      onItemClick={(item) => setActiveItemId(item.id)}
      onToggleCollapsed={setIsCollapsed}
    />
  );
};

const Layout = ({ ...props }: PropsAndArgs) => {
  const { euiTheme } = useEuiTheme();
  const [navigationWidth, setNavigationWidth] = useState(0);
  const [activeItemId, setActiveItemId] = useState(props.activeItemId || PRIMARY_MENU_ITEMS[0].id);
  const [isCollapsed, setIsCollapsed] = useState(props.isCollapsed ?? false);

  const headerHeight = 48;

  return (
    <>
      <EuiSkipLink destinationId={APP_MAIN_SCROLL_CONTAINER_ID}>Skip the navigation</EuiSkipLink>
      <ChromeLayoutConfigProvider
        value={{
          bannerHeight: 48,
          footerHeight: 48,
          headerHeight,
          navigationWidth,
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
              {...props}
              setWidth={setNavigationWidth}
              isCollapsed={isCollapsed}
              activeItemId={activeItemId}
              onItemClick={(item) => setActiveItemId(item.id)}
              onToggleCollapsed={setIsCollapsed}
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
