/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiOverflowScroll } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

import { NESTED_PANEL_FOOTER_CLASS_NAME } from '../constants';

/**
 * Hook for handling scroll styles.
 *
 * @param withMask - whether to apply a mask to the scrollable content.
 * @returns the scroll styles.
 */
export const useScroll = (withMask: boolean = false) => {
  // `useEuiOverflowScroll` applies a static `mask-image` that fades the outer edges of the scroll
  // container. Sticky headers and footers sit in those edges, so content scrolling under them gets no
  // fade and they draw their own via `getScrollFadeStyles`. Keep the mask anyway: it tapers the scrollbar
  // and the sticky elements' corners into the popover's rounded border, and fades edges without a
  // sticky element.
  const scrollStyles = css`
    ${useEuiOverflowScroll('y', withMask)}
    --secondary-menu-header-height: 42px;
    --secondary-menu-footer-height: 52px;
    scroll-padding-top: var(--secondary-menu-header-height);

    // Keeps keyboard-focused items from scrolling under the sticky panel footer
    &:has(> .${NESTED_PANEL_FOOTER_CLASS_NAME}) {
      scroll-padding-bottom: var(--secondary-menu-footer-height);
    }
  `;

  return scrollStyles;
};

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

/**
 * Fades content scrolling under a sticky header (`top`) or footer (`bottom`) of a scroll container.
 * The EUI overflow mask only fades the scroll container edges, which the sticky header and footer occupy.
 */
export const getScrollFadeStyles = (euiTheme: UseEuiTheme['euiTheme'], edge: 'top' | 'bottom') => {
  const isTop = edge === 'top';
  const scrollRange = euiTheme.size.m;

  // The `animation` shorthand resets `animation-timeline`, so the timeline must be set after it.
  // Without overflow the scroll timeline is inactive and the base `opacity: 0` applies.
  return css`
    @supports (animation-timeline: scroll()) {
      &::after {
        content: '';
        position: absolute;
        ${edge}: 100%;
        left: 0;
        right: 0;
        height: ${euiTheme.size.base};
        background: linear-gradient(
          to ${isTop ? 'bottom' : 'top'},
          ${euiTheme.colors.backgroundBasePlain},
          transparent
        );
        pointer-events: none;
        opacity: 0;
        animation: ${isTop ? fadeIn : fadeOut} linear both;
        animation-timeline: scroll();
        animation-range: ${isTop ? `0px ${scrollRange}` : `calc(100% - ${scrollRange}) 100%`};
      }
    }
  `;
};
