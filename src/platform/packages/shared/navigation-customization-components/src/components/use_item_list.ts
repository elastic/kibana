/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { euiDragDropReorder, type DropResult } from '@elastic/eui';
import type { NavigationItemInfo } from '../types';

export const useItemList = (initial: NavigationItemInfo[]) => {
  const initialItems = useRef(initial);
  const [items, setItems] = useState(initial);

  const visibleItems = useMemo(() => items.filter((item) => !item.hidden), [items]);
  const hiddenItems = useMemo(() => items.filter((item) => item.hidden), [items]);

  const hasChanges = useMemo(() => {
    if (items.length !== initialItems.current.length) return true;
    return items.some(
      (item, i) =>
        item.id !== initialItems.current[i].id || item.hidden !== initialItems.current[i].hidden
    );
  }, [items]);

  const createDragEndHandler = useCallback(
    (section: 'visible' | 'hidden') =>
      ({ source, destination }: DropResult) => {
        if (!destination || source.index === destination.index) return;

        setItems((prev) => {
          const visible = prev.filter((item) => !item.hidden);
          const hidden = prev.filter((item) => item.hidden);

          if (section === 'visible') {
            return [...euiDragDropReorder(visible, source.index, destination.index), ...hidden];
          }
          return [...visible, ...euiDragDropReorder(hidden, source.index, destination.index)];
        });
      },
    []
  );

  const toggleItemVisibility = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, hidden: !item.hidden } : item))
    );
  }, []);

  return {
    items,
    setItems,
    visibleItems,
    hiddenItems,
    hasChanges,
    createDragEndHandler,
    toggleItemVisibility,
  };
};
