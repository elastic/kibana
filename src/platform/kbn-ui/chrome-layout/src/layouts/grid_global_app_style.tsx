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
import { APP_MAIN_SCROLL_CONTAINER_ID, layoutVar } from '../constants';
import type { LayoutAppearance } from '../layout.types';

export const globalLayoutStyles = () => {
  return css`
    :root {
      // There is no fixed header in the grid layout.
      --euiFixedHeadersOffset: 0px;
    }

    // Disable document-level scroll; the application area handles it.
    @media screen {
      :root {
        overflow: hidden;
      }
    }
  `;
};

/**
 * Framed appearance background styles with gradient.
 * Only applied when appearance is 'framed'.
 */
export const framedAppearanceBackgroundStyles = (euiThemeContext: UseEuiTheme) => {
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
const globalTempHackStyles = (
  _euiTheme: UseEuiTheme['euiTheme'],
  appearance: LayoutAppearance
) => css`
  body {
    // adjust position of the collapsible side-navigation flyout
    .euiFlyout.euiCollapsibleNav {
      ${logicalCSS('top', layoutVar('application.top', '0px'))};
      ${logicalCSS('left', layoutVar('application.left', '0px'))};
      ${logicalCSS('bottom', layoutVar('application.bottom', '0px'))};
    }

    // overlay mask "belowHeader" should only cover the application area
    .euiOverlayMask[data-relative-to-header='below'] {
      ${logicalCSS('top', layoutVar('application.top', '0px'))};
      ${logicalCSS('left', layoutVar('application.left', '0px'))};
      ${logicalCSS('right', layoutVar('application.right', '0px'))};
      ${logicalCSS('bottom', layoutVar('application.bottom', '0px'))};
      ${appearance === 'framed' && `border-radius: ${_euiTheme.border.radius.medium};`}
    }

    .euiFlyout[class*='right'] {
      // match the application area border-radius on the right edge,
      // but not for side-by-side child flyouts since they aren't positioned at the rightmost edge
      ${appearance === 'framed' &&
      `&:not([data-managed-flyout-layout-mode="side-by-side"][data-managed-flyout-level="child"]) {
          border-top-right-radius: ${_euiTheme.border.radius.medium};
          border-bottom-right-radius: ${_euiTheme.border.radius.medium};
          .euiFlyoutFooter {
            border-bottom-right-radius: ${_euiTheme.border.radius.medium};
          }
        }`}
    }

    // When overlay is above the header (full-viewport modal style), only border-radius
    // is overridden; positioning is left to the flyout's reference container.
    .euiOverlayMask[data-relative-to-header='above']
      + [data-euiportal='true']
      .euiFlyout[class*='right'] {
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
  body {
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

export interface GridLayoutGlobalStylesProps {
  appearance?: LayoutAppearance;
}

export const GridLayoutGlobalStyles = ({ appearance = 'plain' }: GridLayoutGlobalStylesProps) => {
  const euiTheme = useEuiTheme();
  const isFramedAppearance = appearance === 'framed';

  return (
    <Global
      styles={[
        globalLayoutStyles(),
        globalTempHackStyles(euiTheme.euiTheme, appearance),
        isFramedAppearance && framedAppearanceBackgroundStyles(euiTheme),
      ]}
    />
  );
};
