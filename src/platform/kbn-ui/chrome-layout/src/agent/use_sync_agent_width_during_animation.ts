/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';

import { useLayoutUpdate } from '../layout_config_context';

/**
 * Throttles agentWidth layout-config updates to one per animation frame so global
 * layout CSS vars stay in sync with the motion width tween without over-rendering.
 */
export const useSyncAgentWidthDuringAnimation = (enabled: boolean) => {
  const updateLayout = useLayoutUpdate();
  const rafIdRef = useRef<number>();
  const pendingWidthRef = useRef<number | null>(null);

  const syncWidth = useCallback(
    (width: number) => {
      if (!enabled) {
        return;
      }

      pendingWidthRef.current = Math.round(width);

      if (rafIdRef.current !== undefined) {
        return;
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = undefined;

        if (pendingWidthRef.current === null) {
          return;
        }

        updateLayout({ agentWidth: pendingWidthRef.current });
        pendingWidthRef.current = null;
      });
    },
    [enabled, updateLayout]
  );

  const flushWidth = useCallback(
    (width: number) => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }

      pendingWidthRef.current = null;

      if (enabled) {
        updateLayout({ agentWidth: Math.round(width) });
      }
    },
    [enabled, updateLayout]
  );

  return { syncWidth, flushWidth };
};
