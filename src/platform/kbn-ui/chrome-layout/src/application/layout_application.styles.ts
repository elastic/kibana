/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { euiOverflowScroll, euiShadow, type UseEuiTheme } from '@elastic/eui';
// eslint-disable-next-line import/no-extraneous-dependencies
import { euiBorderStyles } from '@elastic/eui-theme-common';
import { layoutVar, layoutLevels } from '../constants';
import type { LayoutAppearance } from '../layout.types';
import type { EmotionFn } from '../types';

const root = (appearance: LayoutAppearance = 'plain'): EmotionFn => {
  const isFramedAppearance = appearance === 'framed';

  return (useEuiTheme: UseEuiTheme) => {
    const { euiTheme } = useEuiTheme;

    return css`
      grid-area: application;

      height: calc(
        100% - ${layoutVar('application.marginTop')} - ${layoutVar('application.marginBottom')}
      );
      width: calc(100% - ${layoutVar('application.marginRight')});
      margin-top: ${layoutVar('application.marginTop')};
      margin-bottom: ${layoutVar('application.marginBottom')};
      margin-right: ${layoutVar('application.marginRight')};
      // Grid items default to min-width/min-height: auto (content size). Without this the wrapper
      // grows with the content (e.g. push flyout padding) instead of constraining the scroll
      // container below.
      min-width: 0;
      min-height: 0;

      z-index: ${layoutLevels.content};
      position: relative;

      // Only apply distinguished background styling for framed appearance
      ${isFramedAppearance &&
      css`
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-radius: ${euiTheme.border.radius.medium};

        ${euiShadow(useEuiTheme, 'xs', { border: 'none' })};

        // Pseudo-element frame on the non-scrolling wrapper: doesn't affect layout, doesn't scroll
        // away with the content, and doesn't collide with focus outlines.
        // borderBaseFloating is transparent in light mode and visible in dark mode.
        ${euiBorderStyles(useEuiTheme, {
          side: 'all',
          borderColor: euiTheme.colors.borderBaseFloating,
        })}
      `}
      ${!isFramedAppearance &&
      css`
        background-color: transparent;
        border-radius: 0;
        border: none;
      `}
    `;
  };
};

const scrollContainer: EmotionFn = (useEuiTheme) => css`
  border-radius: inherit;
  display: flex;
  flex-direction: column;

  // only restrict overflow scroll on screen (not print) to allow for full page printing
  @media screen {
    ${euiOverflowScroll(useEuiTheme, { direction: 'y' })};
  }
`;

const content: EmotionFn = () => css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const topBar: EmotionFn = ({ euiTheme }) => css`
  position: sticky;
  top: 0;
  z-index: ${layoutLevels.applicationTopBar};
  height: ${layoutVar('application.topBar.height')};
  flex-shrink: 0;
`;

const bottomBar: EmotionFn = ({ euiTheme }) => css`
  position: sticky;
  bottom: 0;
  z-index: ${layoutLevels.applicationBottomBar};
  height: ${layoutVar('application.bottomBar.height')};
  flex-shrink: 0;
`;

export const styles = {
  root,
  scrollContainer,
  content,
  topBar,
  bottomBar,
};
