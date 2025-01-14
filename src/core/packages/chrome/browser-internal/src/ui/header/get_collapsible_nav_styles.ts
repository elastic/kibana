/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UseEuiTheme, euiYScroll, mathWithUnits } from '@elastic/eui';
import { css } from '@emotion/react';

export const getCollapsibleNavStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  const screenHeightBreakpoint = mathWithUnits(euiTheme.size.base, (x) => x * 15);
  const _euiYScroll = euiYScroll(euiThemeContext);

  const navCss = css({
    [`@media (max-height: ${screenHeightBreakpoint})`]: {
      overflowY: 'auto',
    },
  });

  const navRecentsListGroupCss = [
    css({
      maxHeight: `calc(${euiTheme.size.base} * 10)`,
      marginRight: `-${euiTheme.size.s}`,
    }),
    _euiYScroll,
  ];

  const navSolutions = [
    _euiYScroll,
    css({
      /**
       * Allows the solutions nav group to be viewed on
       * very small screen sizes and when the browser Zoom is high
       */
      [`@media (max-height: ${screenHeightBreakpoint})`]: {
        flex: '1 0 auto',
      },
    }),
  ];

  /**
   * 1. Increase the hit area of the link (anchor)
   * 2. Only show the text underline when hovering on the text/anchor portion
   */
  const navSolutionGroupButton = css({
    display: 'block' /* 1 */,

    '&:hover': {
      textDecoration: 'none' /* 2 */,
    },
  });

  const navSolutionGroupLink = css({
    display: 'block' /* 1 */,

    '&:hover': {
      textDecoration: 'underline' /* 2 */,
    },
  });

  return {
    navCss,
    navRecentsListGroupCss,
    navSolutions,
    navSolutionGroupButton,
    navSolutionGroupLink,
  };
};
