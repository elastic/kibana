/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';

export interface LayoutStyleArgs {
  bannerHeight: number;
  footerHeight: number;
  headerHeight: number;
  navigationWidth: number;
  navigationPanelWidth: number;
  sidebarWidth: number;
  sidebarPanelWidth: number;
}

// TODO: clintandrewhall - Handle smaller screens using `useEuiBreakpoints`.
export const useLayoutStyles = ({
  bannerHeight,
  footerHeight,
  headerHeight,
  navigationWidth,
  navigationPanelWidth,
  sidebarWidth,
  sidebarPanelWidth,
}: LayoutStyleArgs) => {
  return css`
    align-items: baseline;
    height: 100vh;
    width: 100vw;
    min-height: 100%;
    min-width: 100%;

    display: grid;

    // TODO: clintandrewhall - Inline these
    grid-template-columns:
      ${navigationWidth}px
      ${navigationPanelWidth}px
      1fr
      ${sidebarPanelWidth}px
      ${sidebarWidth}px;

    grid-template-rows:
      ${bannerHeight}px
      ${headerHeight}px
      1fr
      ${footerHeight}px;

    grid-template-areas:
      'banner banner banner banner banner'
      'navigation navigationPanel header sidebarPanel sidebar'
      'navigation navigationPanel app sidebarPanel sidebar'
      'navigation navigationPanel footer sidebarPanel sidebar';
  `;
};
