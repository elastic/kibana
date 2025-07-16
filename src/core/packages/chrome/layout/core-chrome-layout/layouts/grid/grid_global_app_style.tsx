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
} from '@kbn/core-chrome-layout-constants';
import { CommonGlobalAppStyles } from '../common/global_app_styles';
import {
  useHackSyncPushFlyout,
  hackEuiPushFlyoutPaddingInlineEnd,
  hackEuiPushFlyoutPaddingInlineStart,
} from './hack_use_sync_push_flyout';

const globalLayoutStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
  :root {
    // TODO: these variables are legacy and we keep them for backward compatibility
    // https://github.com/elastic/kibana/issues/225264

    // there is no fixed header in the grid layout, so we want to set the offset to 0
    --euiFixedHeadersOffset: 0px;

    // height of the header banner
    --kbnHeaderBannerHeight: var(--kbn-layout--banner-height, 0px);

    // the current total height of all app-area headers, this variable can be used for sticky headers offset relative to the top of the application area
    --kbnAppHeadersOffset: var(--kbn-application--top-bar-height, 0px);
    --kbn-application--sticky-headers-offset: var(
      --kbn-application--top-bar-height,
      0px
    ); // better name alias to --kbnAppHeadersOffset

    // height of the project header app action menu which is part of the application area
    --kbnProjectHeaderAppActionMenuHeight: var(--kbn-application--top-bar-height, 0px);
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
    top: var(--kbn-application--content-top, 0px);
    right: var(--kbn-application--content-right, 0px);
    bottom: var(--kbn-application--content-bottom, 0px);
    left: var(--kbn-application--content-left, 0px);
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

  #kibana-body .euiDataGrid--fullScreen {
    height: calc(100vh - var(--kbnHeaderBannerHeight));
    top: var(--kbnHeaderBannerHeight);
  }
`;

// temporary hacks that need to be removed after better flyout and global sidenav customization support in EUI
// https://github.com/elastic/eui/issues/8820
const globalTempHackStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
  // adjust position of the classic/project side-navigation
  .kbnBody .euiFlyout.euiCollapsibleNav {
    ${logicalCSS('top', 'var(--kbn-layout--application-top, 0px)')};
    ${logicalCSS('left', 'var(--kbn-layout--application-left, 0px)')};
    ${logicalCSS('bottom', 'var(--kbn-layout--application-bottom, 0px)')};
  }

  // adjust position of all other flyouts
  .kbnBody .euiFlyout:not(.euiCollapsibleNav) {
    // overlay flyout should only cover the application area
    &[class*='right']:not([class*='push']) {
      ${logicalCSS('top', 'var(--kbn-layout--application-top, 0px)')};
      ${logicalCSS('bottom', 'var(--kbn-layout--application-bottom, 0px)')};
      ${logicalCSS('right', 'var(--kbn-layout--application-right, 0px)')};
    }
    // push flyout should only cover the application area
    &[class*='right'][class*='push'] {
      ${logicalCSS('top', 'var(--kbn-layout--application-top, 0px)')};
      ${logicalCSS('bottom', 'var(--kbn-layout--application-bottom, 0px)')};
      ${logicalCSS('right', 'var(--kbn-layout--application-right, 0px)')};
    }

    // ...
    // no use-cases for left flyouts other then .euiCollapsibleNav, so skipping it for now
  }

  // push flyout should be pushing the application area, instead of body
  #${APP_MAIN_SCROLL_CONTAINER_ID} {
    ${logicalCSS('padding-right', `var(${hackEuiPushFlyoutPaddingInlineEnd}, 0px)`)};
    ${logicalCSS('padding-left', `var(${hackEuiPushFlyoutPaddingInlineStart}, 0px)`)};
  }
  .kbnBody {
    ${logicalCSS('padding-right', `0px !important`)};
    ${logicalCSS('padding-left', `0px !important`)};
  }

  // overlay mask "belowHeader" should only cover the application area
  .kbnBody .euiOverlayMask[class*='belowHeader'] {
    ${logicalCSS('top', 'var(--kbn-layout--application-top, 0px)')};
    ${logicalCSS('left', 'var(--kbn-layout--application-left, 0px)')};
    ${logicalCSS('right', 'var(--kbn-layout--application-right, 0px)')};
    ${logicalCSS('bottom', 'var(--kbn-layout--application-bottom, 0px)')};
  }
`;

export const GridLayoutGlobalStyles = () => {
  const { euiTheme } = useEuiTheme();
  useHackSyncPushFlyout();
  return (
    <>
      <Global styles={[globalLayoutStyles(euiTheme), globalTempHackStyles(euiTheme)]} />
      <CommonGlobalAppStyles />
    </>
  );
};
