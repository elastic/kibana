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

export const renderingOverrides = (euiTheme: UseEuiTheme['euiTheme']) => css`
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
`;

export const bannerStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
  .header__topBanner {
    position: fixed;
    top: 0;
    left: 0;
    height: var(--kbnHeaderBannerHeight);
    width: 100%;
    z-index: ${euiTheme.levels.header};
  }

  .header__topBannerContainer {
    height: 100%;
    width: 100%;
  }
`;

export const chromeStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
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

  .chrHeaderHelpMenu__version {
    text-transform: none;
  }

  .chrHeaderBadge__wrapper {
    align-self: center;
    margin-right: ${euiTheme.size.base};
  }

  .header__toggleNavButtonSection {
    .euiBody--collapsibleNavIsDocked & {
      display: none;
    }
  }

  .header__breadcrumbsWithExtensionContainer {
    overflow: hidden; // enables text-ellipsis in the last breadcrumb
    .euiHeaderBreadcrumbs,
    .euiBreadcrumbs {
      // stop breadcrumbs from growing.
      // this makes the extension appear right next to the last breadcrumb
      flex-grow: 0;
      margin-right: 0;

      overflow: hidden; // enables text-ellipsis in the last breadcrumb
    }
  }
  .header__breadcrumbsAppendExtension--last {
    flex-grow: 1;
  }
`;

export const GlobalAppStyle = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <Global
      styles={css`
        ${bannerStyles(euiTheme)} ${chromeStyles(euiTheme)} ${renderingOverrides(euiTheme)}
      `}
    />
  );
};
