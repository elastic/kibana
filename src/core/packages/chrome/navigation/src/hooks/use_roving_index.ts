/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import { useCallback, useEffect } from 'react';

import { getFocusableElements } from '../utils/get_focusable_elements';

export const useRovingIndex = (ref: RefObject<HTMLElement> | null) => {
  const updateTabIndices = useCallback((elements: HTMLElement[]) => {
    elements.forEach((el, idx) => {
      el.tabIndex = idx === 0 ? 0 : -1;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const container = ref?.current;
      if (!container) return;

      const elements = getFocusableElements(container);
      const currentIndex = elements.findIndex((el) => el === document.activeElement);

      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % elements.length;
          break;
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + elements.length) % elements.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = elements.length - 1;
          break;
        default:
          return;
      }

      elements[nextIndex]?.focus();
    },
    [ref]
  );

  useEffect(() => {
    const container = ref?.current;
    if (!container) return;

    const updateChildren = () => {
      const elements = getFocusableElements(container);
      updateTabIndices(elements);
    };

    updateChildren();

    container.addEventListener('keydown', handleKeyDown);

    const observer = new MutationObserver(() => {
      updateChildren();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
    };
  }, [ref, handleKeyDown, updateTabIndices]);
};
