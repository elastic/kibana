/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Subject } from 'rxjs';

function getVisibleHeightInViewport(element: HTMLDivElement) {
  const rect = element.getBoundingClientRect();

  // Find the top and bottom bounds of the element relative to the viewport window
  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(window.innerHeight, rect.bottom);

  // If visibleBottom is less than visibleTop, the element is entirely off-screen
  return Math.max(0, visibleBottom - visibleTop);
}

// Provides a scrollable container that dynamically sets maxHeight to the element's visible height in the viewport,
// ensuring the content remains scrollable without overflowing off-screen.
export function ScrollableContainer({
  children,
  resetVisibleHeight$,
}: {
  children: ReactNode;
  resetVisibleHeight$: Subject<void>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleHeight, setVisibleHeigth] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current) return;
      setVisibleHeigth(getVisibleHeightInViewport(containerRef.current));
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const subscription = resetVisibleHeight$.subscribe(() => setVisibleHeigth(0));
    return () => {
      subscription.unsubscribe();
    };
  }, [resetVisibleHeight$]);

  return (
    <div
      ref={containerRef}
      style={{
        ...(visibleHeight > 0 && { maxHeight: `${visibleHeight}px` }),
        overflow: 'auto',
      }}
    >
      {children}
    </div>
  );
}
