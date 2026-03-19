/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useLayoutEffect, useState } from 'react';
import { useIsWithinBreakpoints } from '@elastic/eui';

export interface ResponsiveNavigationConfig {
  mode?: 'euiBreakpoints' | 'containerWidth';
  getContainer?: () => HTMLElement | null;
  collapseAtWidth?: number;
  expandAtWidth?: number;
}

const DEFAULT_COLLAPSE_AT_WIDTH = 1000;

const getContainerWidth = (container: HTMLElement): number => {
  return Math.floor(container.clientWidth);
};

/**
 * Returns whether the navigation should be forced into collapsed mode.
 *
 * The default behavior keeps the existing EUI breakpoint logic. Container mode
 * allows Kibana to force collapse based on a specific layout container instead.
 */
export const useForcedCollapse = (responsive?: ResponsiveNavigationConfig): boolean => {
  const isWithinBreakpoints = useIsWithinBreakpoints(['xs', 's']);
  const mode = responsive?.mode ?? 'euiBreakpoints';
  const collapseAtWidth = responsive?.collapseAtWidth ?? DEFAULT_COLLAPSE_AT_WIDTH;
  const expandAtWidth = Math.max(collapseAtWidth, responsive?.expandAtWidth ?? collapseAtWidth);

  const [isForcedCollapsed, setIsForcedCollapsed] = useState(() => {
    if (mode !== 'containerWidth') {
      return false;
    }

    const container = responsive?.getContainer?.();
    if (!container) {
      return false;
    }

    return getContainerWidth(container) <= collapseAtWidth;
  });

  const updateFromWidth = useCallback(
    (width: number) => {
      const nextWidth = Math.floor(width);

      setIsForcedCollapsed((current) => {
        if (nextWidth <= collapseAtWidth) {
          return true;
        }

        if (nextWidth >= expandAtWidth) {
          return false;
        }

        return current;
      });
    },
    [collapseAtWidth, expandAtWidth]
  );

  useLayoutEffect(() => {
    if (mode !== 'containerWidth') {
      return;
    }

    const container = responsive?.getContainer?.();
    if (!container) {
      setIsForcedCollapsed(false);
      return;
    }

    updateFromWidth(getContainerWidth(container));

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      updateFromWidth(entry.contentRect.width);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [mode, responsive, updateFromWidth]);

  return mode === 'containerWidth' ? isForcedCollapsed : isWithinBreakpoints;
};
