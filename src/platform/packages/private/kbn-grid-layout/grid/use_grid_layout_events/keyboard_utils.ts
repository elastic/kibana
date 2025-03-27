/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const updateClientY = (
  currentY: number,
  stepY: number,
  isCloseToEdge: boolean,
  type = 'drag'
) => {
  if (isCloseToEdge) {
    switch (type) {
      case 'resize': {
        // update after the position is updated, that's why we use setTimeout
        setTimeout(() =>
          document.activeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        );
      }
      case 'drag': {
        window.scrollTo({ top: window.scrollY + stepY, behavior: 'smooth' });
        return currentY;
      }
    }
  }
  return currentY + stepY;
};
