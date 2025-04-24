/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Global, css } from '@emotion/react';
import { useEuiTheme, euiShadowSmall } from '@elastic/eui';
import { useSyncPushFlyoutStyles } from '@kbn/core-overlays-browser-internal';
import type { ToolbarSize } from './types';
import svg from './illustration_main_bg.svg';

export interface WorkspaceGlobalCSSComponentProps {
  isToolbarOpen: boolean;
  toolbarSize: ToolbarSize | null;
  hasBanner: boolean;
  hasFooter: boolean;
  isChromeVisible: boolean;
  isNavigationCollapsed: boolean;
  isModern: boolean;
}

const dimensions = {
  banner: {
    height: 32,
  },
  navigation: {
    width: {
      collapsed: 48,
      expanded: 248,
    },
  },
  header: {
    height: 48,
  },
  toolbar: {
    width: 56,
  },
  tool: {
    width: {
      regular: 400,
      wide: 800,
    },
  },
  footer: {
    height: 48,
  },
} as const;

export const WorkspaceGlobalCSSComponent = ({
  isToolbarOpen,
  toolbarSize,
  hasBanner,
  hasFooter,
  isChromeVisible,
  isNavigationCollapsed,
  isModern,
}: WorkspaceGlobalCSSComponentProps) => {
  const theme = useEuiTheme();
  const shadow = euiShadowSmall(theme);
  const { euiTheme } = theme;
  const pushFlyoutStyles = useSyncPushFlyoutStyles();

  let toolWidth = `0px`;

  if (isToolbarOpen) {
    switch (toolbarSize) {
      case 'wide':
        toolWidth = `${dimensions.tool.width.wide}px`;
        break;
      case 'regular':
        toolWidth = `${dimensions.tool.width.regular}px`;
        break;
    }
  }

  const its2030 = css`
    // eslint-disable-next-line
    background: rgb(7, 16, 31);
    background: linear-gradient(0deg, rgba(7, 16, 31, 1) 0%, rgba(43, 57, 79, 1) 100%);

    .header__actionMenu {
      background: transparent;
      .euiHeaderLink,
      .euiButtonIcon {
        color: ${euiTheme.colors.textPrimary};
      }
      .euiHeaderLink[disabled],
      .euiButtonIcon[disabled] {
        color: ${euiTheme.colors.textDisabled};
      }
    }

    .euiCollapsibleNav {
      .euiIcon {
        color: ${euiTheme.colors.plainLight};
      }
    }

    body {
      background: url(${svg}) no-repeat bottom left fixed;
    }
  `;

  const styles = css`
    :root {
      ${isModern ? its2030 : ''}

      body {
        padding: 0 !important;
        padding-inline-start: 0 !important;
      }

      /* Banner */
      --kbnWorkspace--banner-top: 0px;
      --kbnWorkspace--banner-height: ${!isChromeVisible || !hasBanner
        ? 0
        : dimensions.banner.height}px;
      --kbnWorkspace--banner-width: 100%;

      /* Header */
      --kbnWorkspace--header-top: var(--kbnWorkspace--banner-height);
      --kbnWorkspace--header-height: ${isChromeVisible ? dimensions.header.height : 0}px;
      --kbnWorkspace--header-width: calc(
        100vw - var(--kbnWorkspace--toolbar-width) - var(--kbnWorkspace--tool-width)
      );

      /* Navigation */
      --kbnWorkspace--navigation-top: calc(
        var(--kbnWorkspace--banner-height) + var(--kbnWorkspace--header-height)
      );
      --kbnWorkspace--navigation-height: ${isChromeVisible
        ? 'calc(100vh - var(--kbnWorkspace--banner-height) - var(--kbnWorkspace--header-height))'
        : '0px'};

      --kbnWorkspace--navigation-width: ${isChromeVisible
        ? isNavigationCollapsed
          ? dimensions.navigation.width.collapsed
          : dimensions.navigation.width.expanded
        : 0}px;

      /* Toolbar */
      --kbnWorkspace--toolbar-top: var(--kbnWorkspace--header-top);
      --kbnWorkspace--toolbar-height: calc(100vh - var(--kbnWorkspace--banner-height));
      --kbnWorkspace--toolbar-width: ${isChromeVisible ? dimensions.toolbar.width : 0}px;

      /* Active Tool */
      --kbnWorkspace--tool-top: var(--kbnWorkspace--header-top);
      --kbnWorkspace--tool-height: calc(100vh - var(--kbnWorkspace--banner-height));
      --kbnWorkspace--tool-width: ${isChromeVisible ? toolWidth : '0px'};

      /* Application */
      --kbnWorkspace--application-top: calc(
        var(--kbnWorkspace--banner-height) + var(--kbnWorkspace--header-height)
      );
      --kbnWorkspace--application-bottom: var(--kbnWorkspace--footer-height);
      --kbnWorkspace--application-left: var(--kbnWorkspace--navigation-width);
      --kbnWorkspace--application-right: calc(
        var(--kbnWorkspace--toolbar-width) + var(--kbnWorkspace--tool-width)
      );
      --kbnWorkspace--application-height: calc(
        100vh - var(--kbnWorkspace--application-top) - var(--kbnWorkspace--application-bottom)
      );
      --kbnWorkspace--application-width: calc(
        100vw - var(--kbnWorkspace--navigation-width) - var(--kbnWorkspace--toolbar-width) -
          var(--kbnWorkspace--tool-width)
      );

      /* Footer */
      --kbnWorkspace--footer-height: ${!isChromeVisible || !hasFooter
        ? 0
        : dimensions.footer.height}px;
      --kbnWorkspace--footer-width: 100%;
      --kbnWorkspace--footer-bottom: 0;

      /* Legacy */
      --kbnAppHeadersOffset: 0;

      .kbnAppWrapper {
        // DO NOT ADD ANY OTHER STYLES TO THIS SELECTOR
        // This a very nested dependency happening in "all" apps
        display: flex;
        flex-flow: column nowrap;
        flex-grow: 1;
        z-index: 0; // This effectively puts every high z-index inside the scope of this wrapper to it doesn't interfere with the header and/or overlay mask
        position: relative; // This is temporary for apps that relied on this being present on \`.application\`
      }

      /* Alterations */
      ${pushFlyoutStyles}

      .kbnBody .euiFlyout:not(.euiCollapsibleNavBeta) {
        // overlay flyout
        &:not([class*='push']) {
          inset-block-start: calc(var(--kbnWorkspace--application-top, 0) + ${euiTheme.size.m});
          inset-block-end: ${euiTheme.size.s};
          inset-inline-end: calc(var(--kbnWorkspace--application-right, 0) + ${euiTheme.size.m});

          border: ${euiTheme.border.thin};
          ${shadow}
          border-radius: ${euiTheme.border.radius.medium};
          clip-path: none;
        }

        // push flyout
        &[class*='push'] {
          inset-block-start: var(--kbnWorkspace--application-top, 0);
          inset-block-end: '0px';
          inset-inline-end: var(--kbnWorkspace--application-right, 0);
        }
      }

      .kbnBody .euiOverlayMask {
        inset-block-start: calc(var(--kbnWorkspace--application-top, 0) + 1px);
        inset-block-end: calc(var(--kbnWorkspace--application-bottom, 0) + 1px);
        inset-inline-start: calc(var(--kbnWorkspace--application-left, 0) + 1px);
        inset-inline-end: calc(var(--kbnWorkspace--application-right, 0) - 1px);
        border-top-left-radius: ${euiTheme.border.radius.medium};
        border-top-right-radius: ${euiTheme.border.radius.medium};
        background: none;

        &:before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;

          background-color: rgb(246, 249, 252, 0.5);
          backdrop-filter: blur(4px);
          border-top-left-radius: ${euiTheme.border.radius.small};
          border-top-right-radius: ${euiTheme.border.radius.small};
        }
      }
    }
  `;

  return <Global styles={styles} />;
};
