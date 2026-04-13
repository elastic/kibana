/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiOverflowScroll } from '@elastic/eui';
import { css } from '@emotion/react';
import { layoutVar } from '@kbn/core-chrome-layout-constants';

const topBarHeightVar = layoutVar('application.topBar.height', '49px');

/**
 * Hook for handling scroll styles.
 *
 * @param withMask - whether to apply a mask to the scrollable content.
 * @returns the scroll styles.
 */
export const useScroll = (withMask: boolean = false) => {
  const scrollStyles = css`
    ${useEuiOverflowScroll('y', withMask)}
    scroll-padding-top: ${topBarHeightVar};
  `;

  return scrollStyles;
};
