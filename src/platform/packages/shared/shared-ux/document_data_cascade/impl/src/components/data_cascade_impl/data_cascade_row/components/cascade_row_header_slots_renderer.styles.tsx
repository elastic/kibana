/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';
import { type UseEuiTheme, useEuiTheme } from '@elastic/eui';

export interface ScrollState {
  isScrollable: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

const useSlotContainerInnerStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  scrollState: ScrollState
) => {
  // Build gradient mask based on scroll position
  const maskImage = useMemo(() => {
    let maskStyle = 'none';

    if (scrollState.canScrollLeft && scrollState.canScrollRight) {
      maskStyle = `linear-gradient(
        to right,
        transparent 0%,
        black ${euiTheme.size.m},
        black calc(100% - ${euiTheme.size.m}),
        transparent 100%
      )`;
    } else if (scrollState.canScrollLeft) {
      maskStyle = `linear-gradient(
        to right,
        transparent 0%,
        black ${euiTheme.size.m}
      )`;
    } else if (scrollState.canScrollRight) {
      maskStyle = `linear-gradient(
        to right,
        black calc(100% - ${euiTheme.size.m}),
        transparent 100%
      )`;
    }
    return { maskImage: maskStyle };
  }, [scrollState, euiTheme.size.m]);

  return css([
    css`
      overflow-x: auto;
      scrollbar-width: none;
      scroll-behavior: smooth;
      &::-webkit-scrollbar {
        display: none;
      }
    `,
    maskImage,
  ]);
};

export const useStyles = (scrollState: ScrollState) => {
  const euiThemeContext = useEuiTheme();

  const slotContainerInnerStyles = useSlotContainerInnerStyles(
    euiThemeContext.euiTheme,
    scrollState
  );

  const slotsScrollButtonBaseStyles = css([
    {
      label: 'slots-scroll-button-base-styles',
      display: 'none',
      position: 'absolute',
      // raise the button higher than the stacking index of the slot container
      zIndex: 1,
      margin: euiThemeContext.euiTheme.size.xxs,
    },
  ]);

  return {
    slotsContainerWrapper: css({
      position: 'relative',
      '&:hover': {
        // use specified label to target the scroll button base styles
        // see {@link https://github.com/emotion-js/emotion/issues/1217}
        '[class*="slots-scroll-button-base-styles"]': {
          display: 'block',
        },
      },
    }),
    slotsLeftScrollButton: css([
      slotsScrollButtonBaseStyles,
      {
        left: 0,
      },
    ]),
    slotsRightScrollButton: css([
      slotsScrollButtonBaseStyles,
      {
        right: 0,
      },
    ]),
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
      slotContainerInnerStyles,
    ]),
    slotItemWrapper: css({
      justifyContent: 'center',
      alignItems: 'center',
      borderLeft: `${euiThemeContext.euiTheme.border.width.thin} solid ${euiThemeContext.euiTheme.border.color}`,
      paddingLeft: euiThemeContext.euiTheme.size.s,
      flexGrow: 0,

      '& > *': {
        // Ensure that all direct children of the slot wrapper
        // that render numbers have the same font size and weight for consistency
        fontVariantNumeric: 'tabular-nums',
      },
    }),
  };
};
