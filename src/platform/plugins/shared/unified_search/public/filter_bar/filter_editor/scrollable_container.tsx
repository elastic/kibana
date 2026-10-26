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

function getClippedHeight(element: HTMLDivElement) {
  const rect = element.getBoundingClientRect();

  // do not set maxHeight when content is not clipped
  if (rect.top > 0 && rect.bottom < window.innerHeight) {
    return 0;
  }

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
  const [clippedHeight, setClippedHeight] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    function updateClippedHeight() {
      if (!containerRef.current) return;
      setClippedHeight(getClippedHeight(containerRef.current));
    }

    const resizeObserver = new ResizeObserver(updateClippedHeight);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', updateClippedHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateClippedHeight);
    };
  }, []);

  useEffect(() => {
    // Clear visible height on reset to allow children to grow to new content size
    const subscription = resetVisibleHeight$.subscribe(() => setClippedHeight(0));
    return () => {
      subscription.unsubscribe();
    };
  }, [resetVisibleHeight$]);

  return (
    <div
      ref={containerRef}
      style={{
        ...(clippedHeight > 0 && { maxHeight: `${clippedHeight}px` }),
        overflow: 'auto',
      }}
    >
      {children}
    </div>
  );
}
