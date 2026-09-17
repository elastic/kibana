/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { IGNORE_ATTR } from '../constants';
import { createLayoutTracker } from '../lib/layout_tracker';
import { useAnnotationsState } from './annotations_context';

export interface LayerZIndex {
  pins: number;
  /** Floating panels and notices. */
  panel: number;
  /** Popovers opened from pins; EUI derives popover z-indexes from the anchor's offset parents, which our fixed layers do not have. */
  popover: number;
}

/**
 * Above EUI flyouts and modals (comments live inside them) but below toasts.
 * While a full-screen screenshot opened from the layer is showing, below its
 * mask, so it covers the layer like it covers the page.
 */
export const useLayerZIndex = (): LayerZIndex => {
  const { euiTheme } = useEuiTheme();
  const overlayOpen = useAnnotationsState((state) => state.overlayOpen);
  return useMemo(() => {
    const base = overlayOpen ? Number(euiTheme.levels.mask) - 10 : Number(euiTheme.levels.modal);
    return { pins: base + 2, panel: base + 4, popover: base + 6 };
  }, [euiTheme.levels, overlayOpen]);
};

/**
 * `body`-level container marked as developer tool UI, so nothing rendered into
 * it can be annotated. It has no size: the layer's elements are fixed, and EUI
 * popovers inserted into it keep their document coordinates while stacking
 * with the layer. Null before mount.
 */
export const useLayerPortal = (id: string, zIndex: number): HTMLElement | null => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const { euiTheme, colorMode } = useEuiTheme();
  const textColor = euiTheme.colors.textParagraph;

  useEffect(() => {
    if (container) {
      container.style.color = textColor;
      container.style.colorScheme = colorMode === 'DARK' ? 'dark' : 'light';
    }
  }, [container, textColor, colorMode]);

  useEffect(() => {
    if (container) {
      container.style.zIndex = String(zIndex);
    }
  }, [container, zIndex]);

  useEffect(() => {
    const element = document.createElement('div');
    element.id = id;
    element.setAttribute(IGNORE_ATTR, 'true');
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.left = '0';
    document.body.appendChild(element);
    setContainer(element);
    return () => {
      element.remove();
      setContainer(null);
    };
  }, [id]);
  return container;
};

/** The layer's single set of layout observers; see `ResolvedAnchorsProvider` for the elements it watches. */
export const layoutTracker = createLayoutTracker();

/** Increments (at most once a frame) when the page scrolls, resizes, mutates or settles an animation, so that consumers re-measure the elements they follow. */
export const useLayoutTick = (): number =>
  useSyncExternalStore(layoutTracker.subscribe, layoutTracker.getTick);

const CLOCK_INTERVAL_MS = 30_000;
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | undefined;
let clockNow = 0;

const subscribeClock = (listener: () => void) => {
  if (clockListeners.size === 0) {
    clockNow = Date.now();
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((clockListener) => clockListener());
    }, CLOCK_INTERVAL_MS);
  }
  clockListeners.add(listener);
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      clearInterval(clockTimer);
    }
  };
};

/** The current time, refreshed every half minute for all subscribers at once, so relative timestamps keep up. */
export const useNow = (): number => useSyncExternalStore(subscribeClock, () => clockNow);
