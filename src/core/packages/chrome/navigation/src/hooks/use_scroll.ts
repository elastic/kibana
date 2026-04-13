/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiOverflowScroll, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Hook for handling scroll styles.
 *
 * @param withMask - whether to apply a mask to the scrollable content.
 * @returns the scroll styles.
 */
export const useScroll = (withMask: boolean = false) => {
  const { euiTheme } = useEuiTheme();

  return css`
    ${useEuiOverflowScroll('y', withMask)}
    /* Approx sticky secondary menu title: vertical padding + one title line (header height is content-based). */
    scroll-padding-top: calc(${euiTheme.size.base} + ${euiTheme.size.base} + ${euiTheme.size.l});
  `;
};
