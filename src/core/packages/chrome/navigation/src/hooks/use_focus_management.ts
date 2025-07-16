/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RefObject, useCallback } from 'react';

/**
 * Hook for getting focusable elements
 */
export const useFocusableElements = (ref: RefObject<HTMLElement>) => {
  return useCallback(() => {
    if (!ref.current) return [];

    const selector = [
      'button:not([disabled])',
      '[href]:not([tabindex="-1"])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="menuitem"]',
    ].join(',');

    return Array.from(ref.current.querySelectorAll(selector)).filter(
      (el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
    ) as HTMLElement[];
  }, [ref]);
};

/**
 * Hook for focusing first interactive element
 */
export const useFocusFirst = (ref: RefObject<HTMLElement>) => {
  const getFocusableElements = useFocusableElements(ref);

  return useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);
};

/**
 * Hook for focus trap functionality
 */
export const useFocusTrap = (ref: RefObject<HTMLElement>) => {
  const getFocusableElements = useFocusableElements(ref);

  return useCallback(
    (e: KeyboardEvent) => {
      if (!ref.current || e.key !== 'Tab') return;
      if (!ref.current.contains(document.activeElement)) return;

      const elements = getFocusableElements();
      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [ref, getFocusableElements]
  );
};

/**
 * Hook for focus blur handling
 */
export const useFocusBlur = (
  triggerRef: RefObject<HTMLElement>,
  popoverRef: RefObject<HTMLElement>,
  onClose: () => void
) => {
  return useCallback(
    (e: React.FocusEvent) => {
      const nextFocused = e.relatedTarget as Node;
      const isStayingInComponent =
        nextFocused &&
        (triggerRef.current?.contains(nextFocused) || popoverRef.current?.contains(nextFocused));

      if (!isStayingInComponent) {
        onClose();
      }
    },
    [triggerRef, popoverRef, onClose]
  );
};
