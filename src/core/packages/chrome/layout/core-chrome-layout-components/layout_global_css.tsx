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
import { layoutVar, layoutVarName } from '@kbn/core-chrome-layout-constants';
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
  } = useLayoutState();

  const banner = css`
    ${layoutVarName('banner.top')}: 0;
    ${layoutVarName('banner.left')}: 0;
    ${layoutVarName('banner.height')}: ${bannerHeight}px;
    ${layoutVarName('banner.width')}: 100vw;
    ${layoutVarName('banner.bottom')}: calc(100vh - ${layoutVar('banner.height')});
    ${layoutVarName('banner.right')}: 0;
  `;

  const header = css`
    ${layoutVarName('header.top')}: ${layoutVar('banner.height')};
    ${layoutVarName('header.left')}: ${navigationWidth}px;
    ${layoutVarName('header.right')}: ${sidebarWidth}px;
    ${layoutVarName('header.height')}: ${headerHeight}px;
    ${layoutVarName('header.width')}: calc(
      100vw - ${layoutVar('header.left')} - ${layoutVar('header.right')}
    );
    ${layoutVarName('header.bottom')}: calc(
      100vh - ${layoutVar('banner.height')} + ${layoutVar('header.height')}
    );
  `;

  const footer = css`
    ${layoutVarName('footer.height')}: ${footerHeight}px;
    ${layoutVarName('footer.top')}: calc(100vh - ${layoutVar('footer.height')});
    ${layoutVarName('footer.bottom')}: 0;
    ${layoutVarName('footer.left')}: 0;
    ${layoutVarName('footer.right')}: 0;
    ${layoutVarName('footer.width')}: 100vw;
  `;

  const navigation = css`
    ${layoutVarName('navigation.top')}: ${layoutVar('banner.height')};
    ${layoutVarName('navigation.bottom')}: ${layoutVar('footer.height')};
    ${layoutVarName('navigation.left')}: 0;
    ${layoutVarName('navigation.right')}: calc(100vw - ${navigationWidth}px);
    ${layoutVarName('navigation.height')}: calc(
      100vh - ${layoutVar('navigation.top')} - ${layoutVar('navigation.bottom')}
    );
    ${layoutVarName('navigation.width')}: ${navigationWidth}px;
  `;

  const sidebar = css`
    ${layoutVarName('sidebar.top')}: ${layoutVar('banner.height')};
    ${layoutVarName('sidebar.bottom')}: ${layoutVar('footer.height')};
    ${layoutVarName('sidebar.right')}: 0;
    ${layoutVarName('sidebar.left')}: calc(100vw - ${sidebarWidth}px);
    ${layoutVarName('sidebar.height')}: calc(
      100vh - ${layoutVar('sidebar.top')} - ${layoutVar('sidebar.bottom')}
    );
    ${layoutVarName('sidebar.width')}: ${sidebarWidth}px;
  `;

  const application = css`
    ${layoutVarName('application.top')}: calc(
      ${layoutVar('banner.height')} + ${layoutVar('header.height')}
    );
    ${layoutVarName('application.bottom')}: ${layoutVar('footer.height')};
    ${layoutVarName('application.left')}: ${navigationWidth}px;
    ${layoutVarName('application.right')}: ${sidebarWidth}px;
    ${layoutVarName('application.height')}: calc(
      100vh - ${layoutVar('application.top')} - ${layoutVar('application.bottom')}
    );
    ${layoutVarName('application.width')}: calc(
      100vw - ${layoutVar('application.left')} - ${layoutVar('application.right')}
    );
  `;

  const applicationTopBar = css`
    ${layoutVarName('application.topBar.height')}: ${applicationTopBarHeight}px;
    ${layoutVarName('application.topBar.top')}: ${layoutVar('application.top')};
    ${layoutVarName('application.topBar.left')}: ${layoutVar('application.left')};
    ${layoutVarName('application.topBar.width')}: ${layoutVar('application.width')};
    ${layoutVarName('application.topBar.right')}: ${layoutVar('application.right')};
    ${layoutVarName('application.topBar.bottom')}: calc(
      ${layoutVar('application.top')} + ${layoutVar('application.topBar.height')}
    );
  `;

  const applicationBottomBar = css`
    ${layoutVarName('application.bottomBar.height')}: ${applicationBottomBarHeight}px;
    ${layoutVarName('application.bottomBar.top')}: calc(
      100vh - ${layoutVar('footer.height')} - ${layoutVar('application.bottomBar.height')}
    );
    ${layoutVarName('application.bottomBar.left')}: ${layoutVar('application.left')};
    ${layoutVarName('application.bottomBar.width')}: ${layoutVar('application.width')};
    ${layoutVarName('application.bottomBar.right')}: ${layoutVar('application.right')};
    ${layoutVarName('application.bottomBar.bottom')}: ${layoutVar('footer.height')};
  `;

  // The application content is the main area where the application renders its content.
  // It is not a slot, but it is styled to ensure it fits within the layout.
  // It is positioned inside application area and takes the full height available minus that application top and bottom bars.
  const applicationContent = css`
    ${layoutVarName('application.content.top')}: calc(
      ${layoutVar('application.top')} + ${layoutVar('application.topBar.height')}
    );
    ${layoutVarName('application.content.bottom')}: calc(
      ${layoutVar('footer.height')} + ${layoutVar('application.bottomBar.height')}
    );
    ${layoutVarName('application.content.left')}: ${layoutVar('application.left')};
    ${layoutVarName('application.content.right')}: ${layoutVar('application.right')};
    ${layoutVarName('application.content.height')}: calc(
      ${layoutVar('application.height')} - ${layoutVar('application.topBar.height')} -
        ${layoutVar('application.bottomBar.height')}
    );
    ${layoutVarName('application.content.width')}: ${layoutVar('application.width')};
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
