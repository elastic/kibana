/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { SIDE_PANEL_WIDTH } from './use_layout_width';
import {
  applyElasticSidePanelWidth,
  clampSidePanelWidth,
  resolveSidePanelWidthOnRelease,
} from '../utils/side_panel_width_utils';

export {
  clampSidePanelWidth,
  getMaxSidePanelWidth,
  MIN_SIDE_PANEL_WIDTH,
} from '../utils/side_panel_width_utils';

const SIDE_PANEL_WIDTH_STORAGE_KEY = 'core.chrome.sideNavSecondaryPanelWidth';

function readStoredSidePanelWidth(): number {
  const stored = localStorage.getItem(SIDE_PANEL_WIDTH_STORAGE_KEY);
  if (stored) {
    const parsed = Number(stored);
    if (!Number.isNaN(parsed)) {
      return clampSidePanelWidth(parsed);
    }
  }
  return SIDE_PANEL_WIDTH;
}

function persistSidePanelWidth(width: number): void {
  localStorage.setItem(SIDE_PANEL_WIDTH_STORAGE_KEY, String(width));
}

/**
 * Manages resizable secondary navigation panel width with localStorage persistence.
 */
export const useSidePanelWidth = () => {
  const [width, setWidthState] = useState(readStoredSidePanelWidth);
  const persistedWidthRef = useRef(width);

  const setWidth = useCallback((newWidth: number) => {
    const clamped = clampSidePanelWidth(newWidth);
    setWidthState(clamped);

    if (persistedWidthRef.current !== clamped) {
      persistedWidthRef.current = clamped;
      persistSidePanelWidth(clamped);
    }
  }, []);

  const setDragWidth = useCallback((rawWidth: number) => {
    setWidthState(applyElasticSidePanelWidth(rawWidth));
  }, []);

  const commitDragWidth = useCallback(
    (rawWidth: number): boolean => {
      const resolution = resolveSidePanelWidthOnRelease(rawWidth);

      if (resolution.type === 'collapse') {
        setWidthState(persistedWidthRef.current);
        return true;
      }

      setWidth(resolution.width);
      return false;
    },
    [setWidth]
  );

  useEffect(() => {
    const handleWindowResize = () => {
      setWidthState((current) => {
        const clamped = clampSidePanelWidth(current);
        if (clamped !== current) {
          persistedWidthRef.current = clamped;
          persistSidePanelWidth(clamped);
        }
        return clamped;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  return { width, setWidth, setDragWidth, commitDragWidth };
};
