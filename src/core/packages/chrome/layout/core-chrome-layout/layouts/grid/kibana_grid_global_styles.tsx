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
import { logicalCSS } from '@elastic/eui';
import type { LayoutAppearance } from '@kbn/ui-chrome-layout';
import { GridLayoutGlobalStyles, layoutVar } from '@kbn/ui-chrome-layout';
import { APP_FIXED_VIEWPORT_ID } from '../../kibana_layout_constants';

const kibanaGlobalLayoutStyles = css`
  :root {
    // These variables remain for backward compatibility with Kibana applications.
    // https://github.com/elastic/kibana/issues/285537
    --kbnHeaderBannerHeight: ${layoutVar('banner.height', '0px')};
    --kbnAppHeadersOffset: ${layoutVar('application.topBar.height', '0px')};
    --kbn-application--sticky-headers-offset: ${layoutVar('application.topBar.height', '0px')};
  }

  #kibana-body {
    // Overflow here breaks sticky navigation.
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }

  // Restricts chart tooltips to the visible application viewport.
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
    // This selector is a nested dependency shared by all Kibana applications.
    // DO NOT ADD ANY OTHER STYLES TO THIS SELECTOR
    display: flex;
    flex-flow: column nowrap;
    flex-grow: 1;
    z-index: 0;
    position: relative;
  }

  // Make data grid full-screen mode respect the header banner and sidebar.
  #kibana-body .euiDataGrid--fullScreen {
    height: calc(100vh - var(--kbnHeaderBannerHeight));
    top: var(--kbnHeaderBannerHeight);
    right: ${layoutVar('sidebar.width', '0px')};
  }

  .kbnBody {
    // Mirror body-level EUI padding resets for Kibana's body class.
    ${logicalCSS('padding-right', `0px !important`)};
    ${logicalCSS('padding-left', `0px !important`)};
    ${logicalCSS('padding-bottom', `0px !important`)};
    ${logicalCSS('padding-top', `0px !important`)};
  }
`;

export const KibanaGridLayoutGlobalStyles = ({ appearance }: { appearance: LayoutAppearance }) => (
  <>
    <GridLayoutGlobalStyles appearance={appearance} />
    <Global styles={kibanaGlobalLayoutStyles} />
  </>
);
