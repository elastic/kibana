/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type UseEuiTheme, useEuiTheme } from '@elastic/eui';

const getSlotContainerInnerStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;
  &::-webkit-scrollbar {
    display: none;
  }

  [data-can-scroll-left='true'][data-can-scroll-right='true'] > & {
    mask-image: linear-gradient(
      to right,
      transparent 0%,
      black ${euiTheme.size.m},
      black calc(100% - ${euiTheme.size.m}),
      transparent 100%
    );
  }
  [data-can-scroll-left='true']:not([data-can-scroll-right='true']) > & {
    mask-image: linear-gradient(to right, transparent 0%, black ${euiTheme.size.m});
  }
  :not([data-can-scroll-left='true'])[data-can-scroll-right='true'] > & {
    mask-image: linear-gradient(to right, black calc(100% - ${euiTheme.size.m}), transparent 100%);
  }
`;

export const useStyles = () => {
  const euiThemeContext = useEuiTheme();

  const slotContainerInnerStyles = getSlotContainerInnerStyles(euiThemeContext.euiTheme);

  const slotsScrollButtonBaseStyles = css({
    display: 'none',
    position: 'absolute',
    // raise the button higher than the stacking index of the slot container
    zIndex: 1,
    margin: euiThemeContext.euiTheme.size.xxs,
  });

  return {
    slotsContainerWrapper: css({
      position: 'relative',
      '&:hover': {
        '&[data-can-scroll-left="true"] [class*="slots-scroll-button-left"]': {
          display: 'block',
        },
        '&[data-can-scroll-right="true"] [class*="slots-scroll-button-right"]': {
          display: 'block',
        },
      },
    }),
    slotsLeftScrollButton: css([
      slotsScrollButtonBaseStyles,
      { label: 'slots-scroll-button-left', left: 0 },
    ]),
    slotsRightScrollButton: css([
      slotsScrollButtonBaseStyles,
      { label: 'slots-scroll-button-right', right: 0 },
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
