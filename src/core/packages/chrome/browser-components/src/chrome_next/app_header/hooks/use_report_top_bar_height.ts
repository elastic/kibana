/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, useEffect } from 'react';
import { useLayoutUpdate } from '@kbn/core-chrome-layout-components';

/**
 * Measures the height of the application top bar via ResizeObserver and
 * reports it to the layout system through `useLayoutUpdate`.
 * Returns a ref callback to attach to the top bar root element.
 * Reports `0` when the element is removed or on unmount.
 */
export const useReportTopBarHeight = (): ((node: HTMLElement | null) => void) => {
  const updateLayout = useLayoutUpdate();
  const observerRef = useRef<ResizeObserver | null>(null);
  const lastHeightRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      updateLayout({ applicationTopBarHeight: 0 });
    };
  }, [updateLayout]);

  const refCallback = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();

      if (!node) {
        if (lastHeightRef.current !== 0) {
          lastHeightRef.current = 0;
          updateLayout({ applicationTopBarHeight: 0 });
        }
        return;
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const height = Math.round(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
        if (height !== lastHeightRef.current) {
          lastHeightRef.current = height;
          updateLayout({ applicationTopBarHeight: height });
        }
      });

      observer.observe(node, { box: 'border-box' });
      observerRef.current = observer;
    },
    [updateLayout]
  );

  return refCallback;
};
