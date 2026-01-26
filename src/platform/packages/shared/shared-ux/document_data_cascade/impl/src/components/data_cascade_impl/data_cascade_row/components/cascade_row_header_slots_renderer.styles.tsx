/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export interface ScrollState {
  isScrollable: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

const getSlotContainerInnerStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  scrollState: ScrollState
) => {
  let maskImage = 'none';

  // Build gradient mask based on scroll position
  if (scrollState.canScrollLeft && scrollState.canScrollRight) {
    maskImage = `linear-gradient(
        to right,
        transparent 0%,
        black ${euiTheme.size.m},
        black calc(100% - ${euiTheme.size.m}),
        transparent 100%
      )`;
  } else if (scrollState.canScrollLeft) {
    maskImage = `linear-gradient(
        to right,
        transparent 0%,
        black ${euiTheme.size.m}
      )`;
  } else if (scrollState.canScrollRight) {
    maskImage = `linear-gradient(
        to right,
        black calc(100% - ${euiTheme.size.m}),
        transparent 100%
      )`;
  }

  return css`
    overflow-x: auto;
    scrollbar-width: none;
    scroll-behavior: smooth;
    &::-webkit-scrollbar {
      display: none;
    }
    mask-image: ${maskImage};
  `;
};

export const styles = (euiTheme: UseEuiTheme['euiTheme'], scrollState: ScrollState) => {
  return {
    slotsContainer: css`
      min-width: 0;
      width: 100%;
      overflow-x: auto;
      scrollbar-width: none;
      scroll-behavior: smooth;
    `,
    slotsContainerInner: css([
      {
        width: 'max-content',
      },
      getSlotContainerInnerStyles(euiTheme, scrollState),
    ]),
    slotItemWrapper: css({
      justifyContent: 'center',
      alignItems: 'center',
      borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
      paddingLeft: euiTheme.size.s,
      flexGrow: 0,

      '& > *': {
        // Ensure that all direct children of the slot wrapper
        // that render numbers have the same font size and weight for consistency
        fontVariantNumeric: 'tabular-nums',
      },
    }),
  };
};
