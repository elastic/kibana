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
import { AT_TOOLTIP_ATTR, IGNORE_ATTR, LAYER_ATTR, MENU_ATTR } from '../constants';
import { createLayoutTracker } from '../lib/layout_tracker';
import { useCommentsState } from './comments_context';

export interface LayerZIndex {
  /** Pins, and the marker of a comment being written, under the panel: one on an element behind it stays behind it. */
  pins: number;
  /** The same on tooltips, which are drawn over everything, the panel included. */
  tooltipPins: number;
  /** Floating panels and notices. */
  panel: number;
  /** Thread and composer popovers, portalled to `body` to stack above the panel. */
  popover: number;
  /** The same at a tooltip, over the tooltip. */
  tooltipPopover: number;
}

/**
 * Above EUI flyouts and modals (comments live inside them) but below toasts,
 * except for what goes over a tooltip, which EUI draws at the toasts' level.
 * Under the mask of a full-screen screenshot opened from the layer, like the page.
 */
export const useLayerZIndex = (): LayerZIndex => {
  const { euiTheme } = useEuiTheme();
  const overlayOpen = useCommentsState((state) => state.overlayOpen);
  return useMemo(() => {
    const base = overlayOpen ? Number(euiTheme.levels.mask) - 10 : Number(euiTheme.levels.modal);
    const top = overlayOpen ? base : Number(euiTheme.levels.toast);
    return {
      pins: base + 2,
      tooltipPins: top + 2,
      panel: base + 4,
      popover: base + 6,
      tooltipPopover: top + 6,
    };
  }, [euiTheme.levels, overlayOpen]);
};

/** Pointer input to the layer stays within it: the page's popovers and flyouts close on clicks outside of them reaching `document`. */
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

/** Keeps `react-focus-lock`, holding focus within the page's open modals and flyouts, from taking it out of the layer's UI. */
const FOCUS_ALLOW_ATTR = 'data-no-focus-lock';

/** For the layer's EUI popover panels, which EUI renders outside of its containers. */
export const popoverPanelProps = {
  [IGNORE_ATTR]: true,
  [FOCUS_ALLOW_ATTR]: true,
  [LAYER_ATTR]: true,
} as Record<string, unknown>;

/** For the panel's menus: EUI closes them on Escape, which comment mode then leaves to it. */
export const menuPanelProps = { ...popoverPanelProps, [MENU_ATTR]: true } as Record<
  string,
  unknown
>;

/** For UI shown at a tooltip, which stays showing while the pointer is on it; see `createTooltipHold`. */
export const atTooltipProps = { [AT_TOOLTIP_ATTR]: true } as Record<string, unknown>;

export const atTooltipPanelProps = { ...popoverPanelProps, ...atTooltipProps };

/** Ref for an `EuiPopover` panel whose z-index follows the layer's, which changes while a screenshot is shown full screen; EUI applies its `zIndex` prop only on positioning. */
export const usePanelZIndex = (zIndex: number): ((panel: HTMLElement | null) => void) => {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (panel) {
      panel.style.zIndex = String(zIndex);
    }
  }, [panel, zIndex]);
  return setPanel;
};

/** `body`-level container marked as the layer's, so nothing rendered into it can be commented on; sizeless, as the layer's elements are fixed. Null before mount. */
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
    element.setAttribute(LAYER_ATTR, 'true');
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

/** Increments, at most once a frame, when the page scrolls, resizes, mutates or settles an animation: time to re-measure. */
export const useLayoutTick = (): number =>
  useSyncExternalStore(layoutTracker.subscribe, layoutTracker.getTick);
