/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { LayoutState } from './layout.types';

const cssProp = css`
  align-items: baseline;
  height: 100vh;
  width: 100vw;
  min-height: 100%;
  min-width: 100%;

  display: grid;

  grid-template-areas:
    'banner banner banner banner'
    'navigation header sidebarPanel sidebar'
    'navigation application sidebarPanel sidebar'
    'footer footer footer footer';
`;

// TODO: clintandrewhall - Handle smaller screens using `useEuiBreakpoints`.
export const useLayoutStyles = (layoutState: LayoutState) => {
  const {
    navigationWidth,
    sidebarPanelWidth,
    sidebarWidth,
    bannerHeight,
    headerHeight,
    footerHeight,
  } = layoutState;

  const style = {
    gridTemplateColumns: `
      ${navigationWidth}px
      1fr
      ${sidebarPanelWidth}px
      ${sidebarWidth}px
    `,
    gridTemplateRows: `
      ${bannerHeight}px
      ${headerHeight}px
      1fr
      ${footerHeight}px
    `,
  };

  return {
    css: cssProp,
    style,
  };
};
