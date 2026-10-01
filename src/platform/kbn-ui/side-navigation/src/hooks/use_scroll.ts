/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiOverflowScroll, useEuiYScrollWithShadows } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Hook for handling scroll styles.
 *
 * @param withMask - whether to apply a mask to the scrollable content.
 * @returns the scroll styles.
 */
export const useScroll = (withMask: boolean = false) => {
  // Animated shadows: top/bottom fades appear only while scrolled away from that edge.
  // Static `useEuiOverflowScroll(..., true)` always fades and eats into first-item padding at rest.
  const maskedScroll = useEuiYScrollWithShadows({ hasAnimatedOverflowShadow: true });
  const plainScroll = useEuiOverflowScroll('y', false);

  // Meant for the menu body between a non-scrolling header and footer.
  // `min-height: 0` lets the body shrink inside a height-bounded flex column.
  return css`
    ${withMask ? maskedScroll : plainScroll}
    flex: 1 1 auto;
    min-height: 0;
  `;
};

/**
 * Column layout for a height-bounded menu: the header and footer keep their size and the body scrolls.
 */
export const scrollLayoutStyles = css`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;
