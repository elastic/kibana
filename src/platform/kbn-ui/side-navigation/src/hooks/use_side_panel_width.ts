/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';

import { SIDE_PANEL_WIDTH } from './use_layout_width';

const SIDE_PANEL_WIDTH_STORAGE_KEY = 'core.chrome.sideNavSecondaryPanelWidth';
const MIN_SIDE_PANEL_WIDTH = 200;
const MAX_SIDE_PANEL_WIDTH_PERCENT = 0.4;

export function getMaxSidePanelWidth(): number {
  return Math.max(
    MIN_SIDE_PANEL_WIDTH,
    Math.floor(window.innerWidth * MAX_SIDE_PANEL_WIDTH_PERCENT)
  );
}

export function clampSidePanelWidth(width: number): number {
  width = Math.floor(width);
  return Math.max(MIN_SIDE_PANEL_WIDTH, Math.min(getMaxSidePanelWidth(), width));
}

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

  const setWidth = useCallback((newWidth: number) => {
    const clamped = clampSidePanelWidth(newWidth);
    setWidthState((current) => {
      if (current === clamped) {
        return current;
      }
      persistSidePanelWidth(clamped);
      return clamped;
    });
  }, []);

  useEffect(() => {
    const handleWindowResize = () => {
      setWidthState((current) => {
        const clamped = clampSidePanelWidth(current);
        if (clamped !== current) {
          persistSidePanelWidth(clamped);
        }
        return clamped;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  return { width, setWidth };
};
