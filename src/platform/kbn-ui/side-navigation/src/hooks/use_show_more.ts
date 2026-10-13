/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Children, useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { getFocusableElements } from '../utils/get_focusable_elements';

// Long lists show this many items first, then grow by `SHOW_MORE_STEP` per "Show more".
const INITIAL_VISIBLE_ITEMS = 5;
const SHOW_MORE_STEP = 10;

interface ShowMore {
  hasMore: boolean;
  listRef: RefObject<HTMLUListElement>;
  showMore: () => void;
  visibleItems: ReactNode[];
}

/**
 * Pages `children` behind "Show more" when `isEnabled`, moving focus to the first revealed item.
 */
export const useShowMore = (children: ReactNode, isEnabled: boolean): ShowMore => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ITEMS);
  const listRef = useRef<HTMLUListElement>(null);
  const focusIndexRef = useRef<number | null>(null);

  const items = Children.toArray(children);
  const hasMore = isEnabled && items.length > visibleCount;

  // "Show more" can unmount itself, so focus moves to the first revealed item. Not limited to keyboard
  // clicks (`detail === 0`): screen readers activate with a regular click. Mouse users get no focus ring.
  useEffect(() => {
    const focusIndex = focusIndexRef.current;
    if (focusIndex === null) return;
    focusIndexRef.current = null;
    const firstRevealed = listRef.current?.children[focusIndex];
    if (firstRevealed instanceof HTMLElement) getFocusableElements(firstRevealed)[0]?.focus();
  }, [visibleCount]);

  const showMore = () => {
    focusIndexRef.current = visibleCount;
    setVisibleCount((count) => count + SHOW_MORE_STEP);
  };

  return {
    hasMore,
    listRef,
    showMore,
    visibleItems: hasMore ? items.slice(0, visibleCount) : items,
  };
};
