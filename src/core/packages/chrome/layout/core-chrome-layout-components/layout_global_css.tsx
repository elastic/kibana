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
import { useLayoutState } from './layout_state_context';

/**
 * Sets up global CSS for the layout using the CSS variables (custom properties) approach.
 * This enables dynamic theming and consistent styling across the application by defining reusable variables at the global scope.
 *
 * @remarks
 * The following CSS variables are defined:
 *
 * Banner:
 *   --kbn-layout--banner-top
 *   --kbn-layout--banner-left
 *   --kbn-layout--banner-height
 *   --kbn-layout--banner-width
 *
 * Header:
 *   --kbn-layout--header-top
 *   --kbn-layout--header-left
 *   --kbn-layout--header-height
 *   --kbn-layout--header-width
 *
 * Navigation:
 *   --kbn-layout--navigation-top
 *   --kbn-layout--navigation-height
 *   --kbn-layout--navigation-width
 *   --kbn-layout--navigation-panel-width
 *
 * Sidebar:
 *   --kbn-layout--sidebar-top
 *   --kbn-layout--sidebar-height
 *   --kbn-layout--sidebar-width
 *   --kbn-layout--sidebar-panel-width
 *
 * Application:
 *   --kbn-layout--application-top
 *   --kbn-layout--application-bottom
 *   --kbn-layout--application-left
 *   --kbn-layout--application-right
 *   --kbn-layout--application-height
 *   --kbn-layout--application-width
 *
 * Footer:
 *   --kbn-layout--footer-top
 *   --kbn-layout--footer-left
 *   --kbn-layout--footer-height
 *   --kbn-layout--footer-width
 *
 * These variables are available globally for consistent layout styling and dynamic updates.
 * @returns The rendered GlobalCSS component.
 */
export const LayoutGlobalCSS = () => {
  const {
    bannerHeight,
    footerHeight,
    headerHeight,
    navigationWidth,
    navigationPanelWidth,
    sidebarWidth,
    sidebarPanelWidth,
  } = useLayoutState();

  const banner = css`
    --kbn-layout--banner-top: 0;
    --kbn-layout--banner-left: 0;
    --kbn-layout--banner-height: ${bannerHeight}px;
    --kbn-layout--banner-width: 100vw;
  `;

  const header = css`
    --kbn-layout--header-top: var(--kbn-layout--banner-height);
    --kbn-layout--header-left: ${navigationWidth + navigationPanelWidth}px;
    --kbn-layout--header-height: ${headerHeight}px;
    --kbn-layout--header-width: calc(
      100vw - var(--kbn-layout--sidebar-width) - var(--kbn-layout--sidebar-panel-width) -
        var(--kbn-layout--header-left)
    );
  `;

  const navigation = css`
    --kbn-layout--navigation-top: ${bannerHeight}px;
    --kbn-layout--navigation-height: calc(100vh - var(--kbn-layout--navigation-top));
    --kbn-layout--navigation-width: ${navigationWidth}px;
    --kbn-layout--navigation-panel-width: ${navigationPanelWidth}px;
  `;

  const sidebar = css`
    --kbn-layout--sidebar-top: ${bannerHeight}px;
    --kbn-layout--sidebar-height: calc(100vh - var(--kbn-layout--sidebar-top));
    --kbn-layout--sidebar-width: ${sidebarWidth}px;
    --kbn-layout--sidebar-panel-width: ${sidebarPanelWidth}px;
  `;

  const application = css`
    --kbn-layout--application-top: ${headerHeight + bannerHeight}px;
    --kbn-layout--application-bottom: ${footerHeight}px;
    --kbn-layout--application-left: ${navigationWidth + navigationPanelWidth}px;
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
    --kbn-layout--footer-left: ${navigationWidth + navigationPanelWidth}px;
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
