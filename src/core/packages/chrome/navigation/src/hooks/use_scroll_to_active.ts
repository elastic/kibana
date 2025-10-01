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
 * Custom hook that provides a ref and scrolls to the element when condition is true.
 *
 * @template T - HTML element type (defaults to HTMLElement)
 * @param condition - When true, scrolls the referenced element into view
 * @returns Ref to attach to the target element
 */
export const useScrollToActive = <T extends HTMLElement = HTMLElement>(isActive?: boolean) => {
  return useCallback(
    (refElement: T | null) => {
      if (refElement && isActive) {
        requestAnimationFrame(() => {
          refElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        });
      }
    },
    [isActive]
  );
};
