/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import {
  euiOverflowScroll,
  euiShadow,
  highContrastModeStyles,
  type UseEuiTheme,
} from '@elastic/eui';
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
      // Grid items default to min-width/min-height: auto; without 0 the wrapper would grow with
      // the content (e.g. push flyout padding) instead of constraining the scroll container.
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

        // The frame is an outline on this non-scrolling wrapper: it doesn't affect layout, doesn't
        // scroll away with the content, isn't touched by focus styles (the focusable element is
        // the scroll container), and sits outside the box where sticky/fixed bars (e.g. console)
        // can't cover it.
        // borderBaseFloating is transparent in light mode and visible in dark mode.
        outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseFloating};
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

  // Keyboard focus only (e.g. skip link when the app has no <main> landmark). Kept outside the
  // box: Chrome clips inset outlines on scroll containers, and EUI's global :focus offsets it -1px.
  // The wrapper must therefore never clip (overflow: hidden), or this ring is cut off.
  // Skipped when focus came from a mouse click (see LayoutApplication).
  &:focus-visible:not([data-pointer-focus]) {
    outline: ${useEuiTheme.euiTheme.focus.width} solid ${useEuiTheme.euiTheme.focus.color};
    outline-offset: 0;

    // Thicker ring so it stands out next to the strong high contrast borders around it.
    ${highContrastModeStyles(useEuiTheme, {
      preferred: `outline-width: calc(${useEuiTheme.euiTheme.focus.width} * 2);`,
    })}
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
