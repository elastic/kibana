/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';

/**
 * Hook that returns a callback to smoothly scroll an element into view when it becomes active.
 *
 * @param isActive - Whether the element should be scrolled into view.
 * @returns A callback function that accepts a ref to scroll into view.
 */
export const useScrollToActive = <T extends HTMLElement = HTMLElement>(isActive?: boolean) => {
  return useCallback(
    (ref: T | null) => {
      if (ref && isActive) {
        requestAnimationFrame(() => {
          ref.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        });
      }
    },
    [isActive]
  );
};
