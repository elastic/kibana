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
import { LayoutStyleArgs } from './layout.styles';

export type LayoutGlobalCSSProps = LayoutStyleArgs;

export const LayoutGlobalCSS = ({
  bannerHeight,
  footerHeight,
  headerHeight,
  navigationWidth,
  navigationPanelWidth,
  sidebarWidth,
  sidebarPanelWidth,
}: LayoutGlobalCSSProps) => {
  const banner = css`
    --kbn-layout--banner-top: 0;
    --kbn-layout--banner-height: ${bannerHeight}px;
    --kbn-layout--banner-width: 100vw;
  `;

  const header = css`
    --kbn-layout--header-top: ${bannerHeight}px;
    --kbn-layout--header-height: ${headerHeight}px;
    --kbn-layout--header-width: 100vw;
  `;

  const navigation = css`
    --kbn-layout--navigation-top: ${bannerHeight + headerHeight}px;
    --kbn-layout--navigation-height: calc(100vh - var(--kbn-layout--navigation-top));
    --kbn-layout--navigation-width: ${navigationWidth}px;
    --kbn-layout--navigation-panel-width: ${navigationPanelWidth}px;
  `;

  const sidebar = css`
    --kbn-layout--sidebar-top: ${bannerHeight + headerHeight}px;
    --kbn-layout--sidebar-height: calc(100vh - var(--kbn-layout--sidebar-top));
    --kbn-layout--sidebar-width: ${sidebarWidth}px;
    --kbn-layout--sidebar-panel-width: ${sidebarPanelWidth}px;
  `;

  const application = css`
    --kbn-layout--application-top: ${headerHeight + bannerHeight}px;
    --kbn-layout--application-bottom: ${footerHeight}px;
    --kbn-layout--application-left: ${navigationWidth}px;
    --kbn-layout--application-right: ${sidebarWidth + sidebarPanelWidth}px;
    --kbn-layout--application-height: calc(
      100vh - var(--kbn-layout--application-top) - var(--kbn-layout--application-bottom)
    );
    --kbn-layout--application-width: calc(
      100vw - var(--kbn-layout--navigation-width) - var(--kbn-layout--navigation-panel-width) -
        var(--kbn-layout--sidebar-width) - var(--kbn-layout--sidebar-panel-width)
    );
  `;

  const footer = css`
    --kbn-layout--footer-top: calc(100vh - var(--kbn-layout--footer-height));
    --kbn-layout--footer-height: ${footerHeight}px;
    --kbn-layout--footer-width: var(--kbn-layout--application-width);
  `;

  const styles = css`
    :root {
      ${banner}
      ${header}
      ${navigation}
      ${sidebar}
      ${application}
      ${footer}
    }
  `;

  return <Global styles={styles} />;
};
