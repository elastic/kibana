/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import { DEVELOPER_TOOLBAR_ID, DEVTOOL_HIDDEN_ATTR, NON_DELETABLE_TAGS } from '../lib/constants';
import { setImportant } from '../lib/dom/set_important';

/**
 * Manages soft-deletion of elements: fades them out, hides them with
 * visibility:hidden (preserves layout), and tracks them for later restore.
 *
 * @param onDelete - Optional callback invoked after each deletion.
 * @returns Deletion handlers and restore utilities.
 */
export const useDeleteElement = (onDelete?: () => void) => {
  const deletedElements = useRef(new Set<HTMLElement>());
  const pendingTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const isDeletable = useCallback((el: HTMLElement): boolean => {
    if (NON_DELETABLE_TAGS.includes(el.tagName)) return false;
    if (el.id === DEVELOPER_TOOLBAR_ID) return false;
    if (el.querySelector(`#${DEVELOPER_TOOLBAR_ID}`)) return false;
    return true;
  }, []);

  const trackDeletion = useCallback((el: HTMLElement) => {
    deletedElements.current.add(el);
  }, []);

  const deleteElement = useCallback(
    (el: HTMLElement) => {
      if (!isDeletable(el)) return;
      setImportant(el, 'pointer-events', 'none');
      el.setAttribute(DEVTOOL_HIDDEN_ATTR, el.style.transform || '');
      deletedElements.current.add(el);
      setImportant(el, 'transition', 'opacity 120ms ease');
      el.style.opacity = '0';
      const timerId = setTimeout(() => {
        pendingTimers.current.delete(timerId);
        // Guard: if undo restored this element during the fade, the attr
        // will have been removed. Skip the visibility change.
        if (!el.hasAttribute(DEVTOOL_HIDDEN_ATTR)) return;
        setImportant(el, 'visibility', 'hidden');
        el.style.transition = '';
        el.style.opacity = '';
      }, 120);
      pendingTimers.current.add(timerId);
      onDelete?.();
    },
    [isDeletable, onDelete]
  );

  const restoreAll = useCallback(() => {
    for (const timerId of pendingTimers.current) {
      clearTimeout(timerId);
    }
    pendingTimers.current.clear();

    for (const el of deletedElements.current) {
      if (el.hasAttribute(DEVTOOL_HIDDEN_ATTR)) {
        el.style.transform = el.getAttribute(DEVTOOL_HIDDEN_ATTR) ?? '';
        el.removeAttribute(DEVTOOL_HIDDEN_ATTR);
      }
      el.style.visibility = '';
      el.style.pointerEvents = '';
    }
    deletedElements.current.clear();
  }, []);

  // Clear any in-flight fade-out timers on unmount to prevent
  // side-effects on elements that may no longer be in the DOM.
  useEffect(() => {
    const timers = pendingTimers;
    return () => {
      for (const timerId of timers.current) {
        clearTimeout(timerId);
      }
      timers.current.clear();
    };
  }, []);

  const deletedCount = useCallback(() => deletedElements.current.size, []);

  return { deleteElement, trackDeletion, restoreAll, deletedCount };
};
