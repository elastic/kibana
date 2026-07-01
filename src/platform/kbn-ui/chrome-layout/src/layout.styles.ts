/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { MIN_AGENT_WIDTH } from '@kbn/ui-chrome-layout-constants';
import type { LayoutState } from './layout.types';

const cssProp = css`
  height: 100vh;
  width: 100vw;
  min-height: 100%;
  min-width: 100%;

  @media screen {
    // do not restrict height when printing
    overflow: hidden;
  }

  display: grid;

  grid-template-areas:
    'banner banner banner banner'
    'header header header header'
    'navigation agent application sidebar'
    'footer footer footer footer';
`;

// TODO: clintandrewhall - Handle smaller screens using `useEuiBreakpoints`.
export const useLayoutStyles = (layoutState: LayoutState) => {
  const {
    navigationWidth,
    agentWidth,
    sidebarWidth,
    bannerHeight,
    headerHeight,
    footerHeight,
    applicationWorkspaceOpen,
    agentWorkspaceOpen,
    hasAgent,
  } = layoutState;

  let agentColumn = `${agentWidth}px`;
  let applicationColumn = '1fr';

  if (hasAgent) {
    if (applicationWorkspaceOpen) {
      agentColumn = 'auto';
      applicationColumn = '1fr';
    } else if (!agentWorkspaceOpen) {
      agentColumn = '0px';
      applicationColumn = '0px';
    } else {
      agentColumn = `minmax(${MIN_AGENT_WIDTH}px, 1fr)`;
      applicationColumn = '0px';
    }
  }

  const style = {
    gridTemplateColumns: `
      ${navigationWidth}px
      ${agentColumn}
      ${applicationColumn}
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
