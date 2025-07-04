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
 * Defines global CSS variables for layout structure using custom properties.
 *
 * The following CSS variables are set and updated dynamically:
 *
 * Banner:
 *   --kbn-layout--banner-[top|left|height|width]
 *
 * Header:
 *   --kbn-layout--header-[top|left|right|height|width]
 *
 * Footer:
 *   --kbn-layout--footer-[height|top|bottom|left|width]
 *
 * Navigation:
 *   --kbn-layout--navigation-[top|bottom|height|width|panel-width]
 *
 * Sidebar:
 *   --kbn-layout--sidebar-[top|bottom|height|width|panel-width]
 *
 * Application:
 *   --kbn-layout--application-[top|bottom|left|right|height|width]
 *
 * Application Top Bar:
 *   --kbn-application--top-bar-[height|top|left|width|right|bottom]
 *
 * Application Bottom Bar:
 *   --kbn-application--bottom-bar-[height|top|left|width|right|bottom]
 *
 * Application Content:
 *   --kbn-application--content-[top|bottom|left|right|height|width]
 *
 * Common:
 *   --kbn-layout--aboveFlyoutLevel
 *
 * These variables are globally available for consistent and dynamic layout styling.
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
    applicationTopBarHeight,
    applicationBottomBarHeight,
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
    --kbn-layout--header-right: ${sidebarWidth + sidebarPanelWidth}px;
    --kbn-layout--header-height: ${headerHeight}px;
    --kbn-layout--header-width: calc(
      100vw - var(--kbn-layout--header-right) - var(--kbn-layout--header-left)
    );
  `;

  const footer = css`
    --kbn-layout--footer-height: ${footerHeight}px;
    --kbn-layout--footer-top: calc(100vh - var(--kbn-layout--footer-height));
    --kbn-layout--footer-bottom: 0px;
    --kbn-layout--footer-left: 0px;
    --kbn-layout--footer-width: 100vw;
  `;

  const navigation = css`
    --kbn-layout--navigation-top: var(--kbn-layout--header-top);
    --kbn-layout--navigation-bottom: var(--kbn-layout--footer-height);
    --kbn-layout--navigation-height: calc(
      100vh - var(--kbn-layout--navigation-top) - var(--kbn-layout--navigation-bottom)
    );
    --kbn-layout--navigation-width: ${navigationWidth}px;
    --kbn-layout--navigation-panel-width: ${navigationPanelWidth}px;
  `;

  const sidebar = css`
    --kbn-layout--sidebar-top: var(--kbn-layout--header-top);
    --kbn-layout--sidebar-bottom: var(--kbn-layout--footer-height);
    --kbn-layout--sidebar-height: calc(
      100vh - var(--kbn-layout--sidebar-top) - var(--kbn-layout--sidebar-bottom)
    );
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

  const applicationTopBar = css`
    --kbn-application--top-bar-height: ${applicationTopBarHeight}px;
    --kbn-application--top-bar-top: var(--kbn-layout--application-top);
    --kbn-application--top-bar-left: var(--kbn-layout--application-left);
    --kbn-application--top-bar-width: var(--kbn-layout--application-width);
    --kbn-application--top-bar-right: var(--kbn-layout--application-right);
    --kbn-application--top-bar-bottom: calc(
      var(--kbn-layout--application-top) + var(--kbn-application--top-bar-height)
    );
  `;

  const applicationBottomBar = css`
    --kbn-application--bottom-bar-height: ${applicationBottomBarHeight}px;
    --kbn-application--bottom-bar-top: calc(
      var(--kbn-layout--application-bottom) - var(--kbn-application--bottom-bar-height)
    );
    --kbn-application--bottom-bar-left: var(--kbn-layout--application-left);
    --kbn-application--bottom-bar-width: var(--kbn-layout--application-width);
    --kbn-application--bottom-bar-right: var(--kbn-layout--application-right);
    --kbn-application--bottom-bar-bottom: var(--kbn-layout--application-bottom);
  `;

  // The application content is the main area where the application renders its content.
  // It is not a slot, but it is styled to ensure it fits within the layout.
  // It is positioned inside application area and takes the full heigh available minus that application top and bottom bars.
  const applicationContent = css`
    --kbn-application--content-top: calc(
      var(--kbn-layout--application-top) + var(--kbn-application--top-bar-height)
    );
    --kbn-application--content-bottom: calc(
      var(--kbn-layout--application-bottom) - var(--kbn-application--bottom-bar-height)
    );
    --kbn-application--content-left: var(--kbn-layout--application-left);
    --kbn-application--content-right: var(--kbn-layout--application-right);
    --kbn-application--content-height: calc(
      var(--kbn-layout--application-height) - var(--kbn-application--top-bar-height) -
        var(--kbn-application--bottom-bar-height)
    );
    --kbn-application--content-width: var(--kbn-layout--application-width);
  `;

  // we want to place layout slots (like sidebar) on top of eui's flyouts (1000),
  // so that when they are open, they are animating from under the sidebars
  // this part of EUI flyout workaround and should be gone with https://github.com/elastic/eui/issues/8820
  const common = css`
    --kbn-layout--aboveFlyoutLevel: 1050;
  `;

  const styles = css`
    :root {
      ${banner}
      ${header}
      ${navigation}
      ${sidebar}
      ${application}
      ${applicationTopBar}
      ${applicationBottomBar}
      ${applicationContent}
      ${footer}
      ${common}
    }
  `;

  return <Global styles={styles} />;
};
