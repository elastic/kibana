/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getScrollTop, scrollToContainer, type ScrollContainer } from '../utils/scroll_container';

export const updateClientY = (
  currentY: number,
  stepY: number,
  isCloseToEdge: boolean,
  type = 'drag',
  scrollContainer: ScrollContainer
) => {
  if (isCloseToEdge) {
    switch (type) {
      case 'drag':
        scrollToContainer(scrollContainer, getScrollTop(scrollContainer) + stepY, 'smooth');
        return currentY;
      case 'resize':
        setTimeout(() =>
          document.activeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        );
    }
  }
  return currentY + stepY;
};
