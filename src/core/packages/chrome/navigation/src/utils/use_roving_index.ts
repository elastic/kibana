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

import { getFocusableElements } from './get_focusable_elements';

export const useRovingIndex = (ref: RefObject<HTMLElement> | null) => {
  const elements = getFocusableElements(ref);

  useEffect(() => {
    elements.forEach((el, idx) => {
      el.tabIndex = idx === 0 ? 0 : -1;
    });
  }, [elements]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          if (elements.length > 0) {
            const currentIndex = elements.findIndex((el) => el === document.activeElement);
            const nextIndex = (currentIndex + 1) % elements.length;
            elements[nextIndex].focus();
          }
          break;
        }
        case 'ArrowUp': {
          if (elements.length > 0) {
            const currentIndex = elements.findIndex((el) => el === document.activeElement);
            const prevIndex = (currentIndex - 1 + elements.length) % elements.length;
            elements[prevIndex].focus();
          }
          break;
        }
        case 'Home': {
          if (elements.length > 0) {
            elements[0].focus();
          }
          break;
        }
        case 'End': {
          if (elements.length > 0) {
            elements[elements.length - 1].focus();
          }
          break;
        }
      }
    },
    [elements]
  );

  useEffect(() => {
    const currentRef = ref?.current;
    currentRef?.addEventListener('keydown', handleKeyDown);

    return () => {
      currentRef?.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, handleKeyDown]);
};
