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
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { CommonGlobalAppStyles } from '../common/global_app_styles';

const globalLayoutStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
  :root {
    // height of the header banner
    --kbnHeaderBannerHeight: ${euiTheme.size.xl};
    // total height of all fixed headers (when the banner is *not* present) inherited from EUI
    --kbnHeaderOffset: var(--euiFixedHeadersOffset, 0px);
    // total height of everything when the banner is present
    --kbnHeaderOffsetWithBanner: calc(var(--kbnHeaderBannerHeight) + var(--kbnHeaderOffset));
    // height of the action menu in the header in serverless projects
    --kbnProjectHeaderAppActionMenuHeight: ${euiTheme.base * 3}px;
  }

  #kibana-body {
    // DO NOT ADD ANY OVERFLOW BEHAVIORS HERE
    // It will break the sticky navigation
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  // Affixes a div to restrict the position of charts tooltip to the visible viewport minus the header
  #app-fixed-viewport {
    pointer-events: none;
    visibility: hidden;
    position: fixed;
    top: var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0));
    right: 0;
    bottom: 0;
    left: 0;
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

  .kbnBody {
    padding-top: var(--euiFixedHeadersOffset, 0);

    // forward compatibility with new grid layout variables,
    --kbn-application--content-height: calc(
      100vh - var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0))
    );
    // forward compatibility with new grid layout variables,
    // this current height of project header app action menu, 0 or the height of the top bar when it is present
    --kbn-application--top-bar-height: 0px;

    // for forward compatibility with grid layout,
    // this variable can be used for sticky headers offset relative to the top of the application area
    --kbn-application--sticky-headers-offset: calc(
      var(--euiFixedHeadersOffset, 0px) + var(--kbn-application--top-bar-height, 0px)
    );
  }

  // Conditionally override :root CSS fixed header variable. Updating \`--euiFixedHeadersOffset\`
  //on the body will cause all child EUI components to automatically update their offsets
  .kbnBody--hasHeaderBanner {
    --euiFixedHeadersOffset: var(--kbnHeaderOffsetWithBanner);

    // Offset fixed EuiHeaders by the top banner
    .euiHeader[data-fixed-header] {
      margin-top: var(--kbnHeaderBannerHeight);
    }

    // Prevent banners from covering full screen data grids
    .euiDataGrid--fullScreen {
      height: calc(100vh - var(--kbnHeaderBannerHeight));
      top: var(--kbnHeaderBannerHeight);
    }
  }

  // Set a body CSS variable for the app container to use - calculates the total
  // height of all fixed headers + the sticky action menu toolbar
  .kbnBody--hasProjectActionMenu {
    --kbnAppHeadersOffset: calc(
      var(--kbnHeaderOffset) + var(--kbnProjectHeaderAppActionMenuHeight)
    );

    &.kbnBody--hasHeaderBanner {
      --kbnAppHeadersOffset: calc(
        var(--kbnHeaderOffsetWithBanner) + var(--kbnProjectHeaderAppActionMenuHeight)
      );
    }

    // forward compatibility with new grid layout variables,
    --kbn-application--top-bar-height: var(--kbnProjectHeaderAppActionMenuHeight);
  }

  .kbnBody--chromeHidden {
    // stylelint-disable-next-line length-zero-no-unit
    --euiFixedHeadersOffset: 0px;

    &.kbnBody--hasHeaderBanner {
      --euiFixedHeadersOffset: var(--kbnHeaderBannerHeight);
    }

    &.kbnBody--hasProjectActionMenu {
      --kbnAppHeadersOffset: var(--euiFixedHeadersOffset, 0);
    }
  }

  .euiDataGrid__restrictBody {
    .headerGlobalNav,
    .kbnQueryBar {
      display: none;
    }
  }

  .euiDataGrid__restrictBody.euiBody--headerIsFixed {
    .euiFlyout {
      top: 0;
      height: 100%;
    }
  }
`;

export const LegacyFixedLayoutGlobalStyles = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <Global styles={globalLayoutStyles(euiTheme)} />
      <CommonGlobalAppStyles />
    </>
  );
};
