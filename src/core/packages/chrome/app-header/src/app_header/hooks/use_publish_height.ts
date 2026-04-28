/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';

export const usePublishHeight = (cssVarName: string, enabled: boolean) => {
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!enabled || !el) {
        document.documentElement.style.removeProperty(cssVarName);
        return;
      }

      observerRef.current = new ResizeObserver(([entry]) => {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
        document.documentElement.style.setProperty(cssVarName, `${height}px`);
      });

      observerRef.current.observe(el);
    },
    [cssVarName, enabled]
  );

  return ref;
};
