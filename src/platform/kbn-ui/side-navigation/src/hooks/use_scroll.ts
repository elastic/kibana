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

/**
 * Hook for handling scroll styles.
 *
 * @param withMask - whether to apply a mask to the scrollable content.
 * @returns the scroll styles.
 */
export const useScroll = (withMask: boolean = false) => {
  // Meant for the menu body between a non-scrolling header and footer, so the EUI mask fades
  // content at those boundaries. `min-height: 0` lets the body shrink inside a height-bounded flex column.
  const scrollStyles = css`
    ${useEuiOverflowScroll('y', withMask)}
    flex: 1 1 auto;
    min-height: 0;
  `;

  return scrollStyles;
};

/**
 * Column layout for a height-bounded menu: the header and footer keep their size and the body scrolls.
 */
export const scrollLayoutStyles = css`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;
