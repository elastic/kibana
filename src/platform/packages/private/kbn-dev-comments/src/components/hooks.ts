/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState, useSyncExternalStore, type SyntheticEvent } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { IGNORE_ATTR } from '../constants';
import { createLayoutTracker } from '../lib/layout_tracker';
import { useCommentsState } from './comments_context';

export interface LayerZIndex {
  pins: number;
  /** Floating panels and notices. */
  panel: number;
  /**
   * Thread and composer popovers, portalled to `body` so that they can stack
   * above the panel; EUI derives popover z-indexes from the anchor's offset
   * parents, which our fixed layers do not have.
   */
  popover: number;
}

/**
 * Above EUI flyouts and modals (comments live inside them) but below toasts.
 * While a full-screen screenshot opened from the layer is showing, below its
 * mask, so it covers the layer like it covers the page.
 */
export const useLayerZIndex = (): LayerZIndex => {
  const { euiTheme } = useEuiTheme();
  const overlayOpen = useCommentsState((state) => state.overlayOpen);
  return useMemo(() => {
    const base = overlayOpen ? Number(euiTheme.levels.mask) - 10 : Number(euiTheme.levels.modal);
    return { pins: base + 2, panel: base + 4, popover: base + 6 };
  }, [euiTheme.levels, overlayOpen]);
};

/**
 * Pointer input to the layer stays within it. Popovers and flyouts on the page
 * close when a click outside of them reaches `document`; that would take a
 * commented element away as its pin or thread is clicked.
 */
const CONTAINED_EVENTS = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'click',
  'touchstart',
  'touchend',
] as const;

const contain = (event: Event | SyntheticEvent) => event.stopPropagation();

/** The same, for what EUI renders outside of the layer's containers: the popovers' content. */
export const containProps = {
  onPointerDown: contain,
  onPointerUp: contain,
  onMouseDown: contain,
  onMouseUp: contain,
  onClick: contain,
  onTouchStart: contain,
  onTouchEnd: contain,
};

/**
 * Keeps `react-focus-lock`, which holds focus within the page's open modals,
 * flyouts and popovers, from taking it back out of the layer's UI.
 */
const FOCUS_ALLOW_ATTR = 'data-no-focus-lock';

/** For the layer's EUI popover panels, which EUI renders outside of the layer's containers. */
export const popoverPanelProps = { [IGNORE_ATTR]: true, [FOCUS_ALLOW_ATTR]: true } as Record<
  string,
  unknown
>;

/**
 * Ref for an `EuiPopover` panel whose z-index is to follow the layer's: EUI
 * applies its `zIndex` prop only when it positions the panel, and the layer's
 * changes while a screenshot is shown full screen.
 */
export const usePanelZIndex = (zIndex: number): ((panel: HTMLElement | null) => void) => {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (panel) {
      panel.style.zIndex = String(zIndex);
    }
  }, [panel, zIndex]);
  return setPanel;
};

/**
 * `body`-level container marked as developer tool UI, so nothing rendered into
 * it can be commented on. It has no size: the layer's elements are fixed. Null
 * before mount.
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
    element.setAttribute(FOCUS_ALLOW_ATTR, 'true');
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.left = '0';
    CONTAINED_EVENTS.forEach((type) => element.addEventListener(type, contain));
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
