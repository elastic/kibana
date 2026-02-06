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
import { layoutVarName } from '@kbn/core-chrome-layout-constants';
import { useLayoutState } from './layout_state_context';

/**
 * Defines global CSS variables for layout structure using custom properties.
 * These variables are globally available for consistent and dynamic layout styling.
 * @returns The rendered GlobalCSS component.
 */
export const LayoutGlobalCSS = () => {
  const {
    bannerHeight,
    footerHeight,
    headerHeight,
    navigationWidth,
    sidebarWidth,
    applicationTopBarHeight,
    applicationBottomBarHeight,
    applicationMarginBottom,
    applicationMarginRight,
  } = useLayoutState();

  // Pre-calculate composite values for simplified CSS expressions
  const headerAndBannerHeight = bannerHeight + headerHeight;
  const applicationBottom = footerHeight + applicationMarginBottom;
  const applicationRight = applicationMarginRight + sidebarWidth;
  const applicationHorizontalOffset = navigationWidth + applicationRight;
  const contentTop = headerAndBannerHeight + applicationTopBarHeight;
  const contentBottom = applicationBottom + applicationBottomBarHeight;

  const banner = css`
    ${layoutVarName('banner.top')}: 0;
    ${layoutVarName('banner.left')}: 0;
    ${layoutVarName('banner.height')}: ${bannerHeight}px;
    ${layoutVarName('banner.width')}: 100vw;
    ${layoutVarName('banner.bottom')}: calc(100vh - ${bannerHeight}px);
    ${layoutVarName('banner.right')}: 0;
  `;

  const header = css`
    ${layoutVarName('header.top')}: ${bannerHeight}px;
    ${layoutVarName('header.left')}: 0;
    ${layoutVarName('header.right')}: 0;
    ${layoutVarName('header.height')}: ${headerHeight}px;
    ${layoutVarName('header.width')}: 100vw;
    ${layoutVarName('header.bottom')}: calc(100vh - ${headerAndBannerHeight}px);
  `;

  const footer = css`
    ${layoutVarName('footer.height')}: ${footerHeight}px;
    ${layoutVarName('footer.top')}: calc(100vh - ${footerHeight}px);
    ${layoutVarName('footer.bottom')}: 0;
    ${layoutVarName('footer.left')}: 0;
    ${layoutVarName('footer.right')}: 0;
    ${layoutVarName('footer.width')}: 100vw;
  `;

  const navigation = css`
    ${layoutVarName('navigation.top')}: ${headerAndBannerHeight}px;
    ${layoutVarName('navigation.bottom')}: ${footerHeight}px;
    ${layoutVarName('navigation.left')}: 0;
    ${layoutVarName('navigation.right')}: calc(100vw - ${navigationWidth}px);
    ${layoutVarName('navigation.height')}: calc(100vh - ${headerAndBannerHeight + footerHeight}px);
    ${layoutVarName('navigation.width')}: ${navigationWidth}px;
  `;

  const sidebar = css`
    ${layoutVarName('sidebar.top')}: ${headerAndBannerHeight}px;
    ${layoutVarName('sidebar.bottom')}: ${footerHeight}px;
    ${layoutVarName('sidebar.right')}: 0;
    ${layoutVarName('sidebar.left')}: calc(100vw - ${sidebarWidth}px);
    ${layoutVarName('sidebar.height')}: calc(100vh - ${headerAndBannerHeight + footerHeight}px);
    ${layoutVarName('sidebar.width')}: ${sidebarWidth}px;
  `;

  const application = css`
    ${layoutVarName('application.marginBottom')}: ${applicationMarginBottom}px;
    ${layoutVarName('application.marginRight')}: ${applicationMarginRight}px;
    ${layoutVarName('application.top')}: ${headerAndBannerHeight}px;
    ${layoutVarName('application.bottom')}: ${applicationBottom}px;
    ${layoutVarName('application.left')}: ${navigationWidth}px;
    ${layoutVarName('application.right')}: ${applicationRight}px;
    ${layoutVarName('application.height')}: calc(100vh - ${headerAndBannerHeight +
    applicationBottom}px);
    ${layoutVarName('application.width')}: calc(100vw - ${applicationHorizontalOffset}px);
  `;

  const applicationTopBar = css`
    ${layoutVarName('application.topBar.height')}: ${applicationTopBarHeight}px;
    ${layoutVarName('application.topBar.top')}: ${headerAndBannerHeight}px;
    ${layoutVarName('application.topBar.left')}: ${navigationWidth}px;
    ${layoutVarName('application.topBar.right')}: ${applicationRight}px;
    ${layoutVarName('application.topBar.width')}: calc(100vw - ${applicationHorizontalOffset}px);
    ${layoutVarName('application.topBar.bottom')}: calc(100vh - ${headerAndBannerHeight +
    applicationTopBarHeight}px);
  `;

  const applicationBottomBar = css`
    ${layoutVarName('application.bottomBar.height')}: ${applicationBottomBarHeight}px;
    ${layoutVarName('application.bottomBar.top')}: calc(100vh - ${footerHeight +
    applicationBottomBarHeight}px);
    ${layoutVarName('application.bottomBar.left')}: ${navigationWidth}px;
    ${layoutVarName('application.bottomBar.right')}: ${applicationRight}px;
    ${layoutVarName('application.bottomBar.width')}: calc(100vw - ${applicationHorizontalOffset}px);
    ${layoutVarName('application.bottomBar.bottom')}: ${footerHeight}px;
  `;

  // The application content is the main area where the application renders its content.
  // It is not a slot, but it is styled to ensure it fits within the layout.
  // It is positioned inside application area and takes the full height available minus the application top and bottom bars.
  const applicationContent = css`
    ${layoutVarName('application.content.top')}: ${contentTop}px;
    ${layoutVarName('application.content.bottom')}: ${contentBottom}px;
    ${layoutVarName('application.content.left')}: ${navigationWidth}px;
    ${layoutVarName('application.content.right')}: ${applicationRight}px;
    ${layoutVarName('application.content.height')}: calc(100vh - ${contentTop + contentBottom}px);
    ${layoutVarName('application.content.width')}: calc(100vw - ${applicationHorizontalOffset}px);
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
    }
  `;

  return <Global styles={styles} />;
};
