/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { DEVELOPER_TOOLBAR_ID, DEVTOOL_HIDDEN_ATTR, NON_DELETABLE_TAGS } from '../lib/constants';

/**
 * Manages soft-deletion of elements: fades them out, hides them with
 * visibility:hidden (preserves layout), and tracks them for later restore.
 */
export const useDeleteElement = (onDelete?: () => void) => {
  const deletedElements = useRef(new Set<HTMLElement>());

  const isDeletable = useCallback((el: HTMLElement): boolean => {
    if (NON_DELETABLE_TAGS.includes(el.tagName)) return false;
    if (el.id === DEVELOPER_TOOLBAR_ID) return false;
    if (el.querySelector(`#${DEVELOPER_TOOLBAR_ID}`)) return false;
    return true;
  }, []);

  const deleteElement = useCallback(
    (el: HTMLElement) => {
      if (!isDeletable(el)) return;
      el.style.pointerEvents = 'none';
      el.setAttribute(DEVTOOL_HIDDEN_ATTR, el.style.transform || '');
      deletedElements.current.add(el);
      el.style.transition = 'opacity 120ms ease';
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.visibility = 'hidden';
        el.style.transition = '';
        el.style.opacity = '';
      }, 120);
      onDelete?.();
    },
    [isDeletable, onDelete]
  );

  const restoreAll = useCallback(() => {
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

  const deletedCount = useCallback(() => deletedElements.current.size, []);

  return { deleteElement, restoreAll, deletedCount };
};
