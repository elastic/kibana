/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css, Global } from '@emotion/react';
import { logicalCSS, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import {
  APP_FIXED_VIEWPORT_ID,
  APP_MAIN_SCROLL_CONTAINER_ID,
  layoutVar,
} from '@kbn/core-chrome-layout-constants';
import { CommonGlobalAppStyles } from '../common/global_app_styles';

const globalLayoutStyles = (euiThemeContext: UseEuiTheme) => {
  return css`
    :root {
      // TODO: these variables are legacy and we keep them for backward compatibility
      // https://github.com/elastic/kibana/issues/225264

      // there is no fixed header in the grid layout, so we want to set the offset to 0
      --euiFixedHeadersOffset: 0px;

      // height of the header banner
      --kbnHeaderBannerHeight: ${layoutVar('banner.height', '0px')};

      // the current total height of all app-area headers, this variable can be used for sticky headers offset relative to the top of the application area
      --kbnAppHeadersOffset: ${layoutVar('application.topBar.height', '0px')};

      // backward compatible way to position sticky sub-headers
      --kbn-application--sticky-headers-offset: ${layoutVar('application.topBar.height', '0px')};

      // height of the project header app action menu which is part of the application area
      --kbnProjectHeaderAppActionMenuHeight: ${layoutVar('application.topBar.height', '0px')};
    }

    // disable document-level scroll, since the application area handles it, but only when not printing
    @media screen {
      :root {
        overflow: hidden;
      }
    }

    #kibana-body {
      // DO NOT ADD ANY OVERFLOW BEHAVIORS HERE
      // It will break the sticky navigation
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }

    // Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header
    #${APP_FIXED_VIEWPORT_ID} {
      pointer-events: none;
      visibility: hidden;
      position: fixed;
      top: ${layoutVar('application.content.top', '0px')};
      right: ${layoutVar('application.content.right', '0px')};
      bottom: ${layoutVar('application.content.bottom', '0px')};
      left: ${layoutVar('application.content.left', '0px')};
    }

    .kbnAppWrapper {
      // DO NOT ADD ANY OTHER STYLES TO THIS SELECTOR
      // This a very nested dependency happening in "all" apps
      display: flex;
      flex-flow: column nowrap;
      flex-grow: 1;
      z-index: 0; // This effectively puts every high z-index inside the scope of this wrapper to it doesn't interfere with the header and/or overlay mask
      position: relative; // This is temporary for apps that relied on this being present on \`.application\`
    }

    // make data grid full screen mode respect the header banner
    #kibana-body .euiDataGrid--fullScreen {
      height: calc(100vh - var(--kbnHeaderBannerHeight));
      top: var(--kbnHeaderBannerHeight);
    }
  `;
};

/**
 * Project mode background styles with gradient.
 * Only applied when chromeStyle is 'project' to differentiate from classic mode.
 */
const projectModeBackgroundStyles = (euiThemeContext: UseEuiTheme) => {
  const { colorMode } = euiThemeContext;
  const isDarkMode = colorMode === 'DARK';

  // Dark mode layered background: radial light source in center, blue tint, dark gradient base
  const darkModeBackground = [
    'radial-gradient(1200px 800px at 50% 50%, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.04))',
    'linear-gradient(rgba(36, 61, 111, 0.1), rgba(36, 61, 111, 0))',
    'linear-gradient(#07101F 0%, #050D1A 50%, #030A16 100%)',
  ].join(', ');

  // Light mode layered background: subtle blue glow at top center, light gradient base
  const lightModeBackground = [
    'radial-gradient(1200px 800px at 50% 0%, rgba(36, 61, 111, 0.04), rgba(36, 61, 111, 0))',
    'linear-gradient(#F6F9FC, #F4F7FA)',
  ].join(', ');

  return css`
    html {
      background: ${isDarkMode ? darkModeBackground : lightModeBackground};
      background-repeat: no-repeat;
    }
  `;
};

// temporary hacks that need to be removed after better flyout and global sidenav customization support in EUI
// https://github.com/elastic/eui/issues/8820
const globalTempHackStyles = (_euiTheme: UseEuiTheme['euiTheme'], chromeStyle: ChromeStyle) => css`
  .kbnBody {
    // overlay mask "belowHeader" should only cover the application area
    .euiOverlayMask[data-relative-to-header='below'] {
      ${logicalCSS('top', layoutVar('application.top', '0px'))};
      ${logicalCSS('left', layoutVar('application.left', '0px'))};
      ${logicalCSS('right', layoutVar('application.right', '0px'))};
      ${logicalCSS('bottom', layoutVar('application.bottom', '0px'))};
      ${chromeStyle === 'project' && `border-radius: ${_euiTheme.border.radius.medium};`}
    }

    // adjust position of all the right flyouts relative to the application area
    .euiFlyout[class*='right'] {
      ${logicalCSS('top', layoutVar('application.top', '0px'))};
      ${logicalCSS('right', layoutVar('application.right', '0px'))};
      ${logicalCSS('bottom', layoutVar('application.bottom', '0px'))};
      // match the application area border-radius on the right edge,
      // but not for side-by-side child flyouts since they aren't positioned at the rightmost edge
      ${chromeStyle === 'project' &&
      `&:not([data-managed-flyout-layout-mode="side-by-side"][data-managed-flyout-level="child"]) {
          border-top-right-radius: ${_euiTheme.border.radius.medium};
          border-bottom-right-radius: ${_euiTheme.border.radius.medium};
          .euiFlyoutFooter {
            border-bottom-right-radius: ${_euiTheme.border.radius.medium};
          }
        }`}
    }

    // if the overlay mask exists that is above the header, set the top, right and bottom of the right flyouts to 0
    .euiOverlayMask[data-relative-to-header='above']
      + [data-euiportal='true']
      .euiFlyout[class*='right'] {
      ${logicalCSS('top', 0)};
      ${logicalCSS('right', 0)};
      ${logicalCSS('bottom', 0)};
      border-radius: 0;
    }
  }

  #${APP_MAIN_SCROLL_CONTAINER_ID} {
    // push flyout should be pushing the application area, instead of body
    ${logicalCSS('padding-right', `var(--euiPushFlyoutOffsetInlineEnd, 0px)`)};
    ${logicalCSS('padding-left', `var(--euiPushFlyoutOffsetInlineStart, 0px)`)};

    // application area should have bottom padding when bottom bar is present
    ${logicalCSS('padding-bottom', `var(--euiBottomBarOffset, 0px)`)};
  }
  .kbnBody {
    // this is a temporary hack to override EUI's body padding with push flyout
    ${logicalCSS('padding-right', `0px !important`)};
    ${logicalCSS('padding-left', `0px !important`)};
    // this is a temporary hack to override EUI's body padding with euibottom bar
    ${logicalCSS('padding-bottom', `0px !important`)};
    // just for consistency with other sides
    ${logicalCSS('padding-top', `0px !important`)};
  }

  // make sure fixed bottom bars are positioned relative to the application area
  .euiBottomBar.euiBottomBar--fixed {
    left: ${layoutVar('application.left', '0px')} !important; /* override EUI inline style */
    right: ${layoutVar('application.right', '0px')} !important; /* override EUI inline style */
    bottom: ${layoutVar('application.bottom', '0px')} !important; /* override EUI inline style */
    border-bottom-left-radius: ${_euiTheme.border.radius.medium} !important;
    border-bottom-right-radius: ${_euiTheme.border.radius.medium} !important;
    box-shadow: ${_euiTheme.shadows.xs.down} !important;
    clip-path: inset(0 -10px -10px -10px) !important;
  }
`;

// TODO: https://github.com/elastic/kibana/issues/251035
type ChromeStyle = 'project' | 'classic';

interface GridLayoutGlobalStylesProps {
  chromeStyle?: ChromeStyle;
}

export const GridLayoutGlobalStyles = ({
  chromeStyle = 'classic',
}: GridLayoutGlobalStylesProps) => {
  const euiTheme = useEuiTheme();
  const isProjectStyle = chromeStyle === 'project';

  return (
    <>
      <Global
        styles={[
          globalLayoutStyles(euiTheme),
          globalTempHackStyles(euiTheme.euiTheme, chromeStyle),
          // Only apply the decorative background for project mode
          isProjectStyle && projectModeBackgroundStyles(euiTheme),
        ]}
      />
      <CommonGlobalAppStyles />
    </>
  );
};
