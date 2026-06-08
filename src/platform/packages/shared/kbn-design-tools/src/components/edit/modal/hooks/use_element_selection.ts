/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { rgbToHex, useEuiTheme } from '@elastic/eui';
import { isTransparentColor } from '../../../../lib/dom/is_transparent_color';
import { useOverlayZIndex } from '../../../../hooks/use_overlay_z_index';

interface UseElementSelectionResult {
  selectedElement: Element | null;
  color: string;
  setColor: (color: string) => void;
  handleSelect: (element: Element) => void;
}

/**
 * Manages element selection state in the edit modal: tracks the selected element,
 * highlights its clone in the preview, and reads its background color.
 *
 * @param elementMap - Map of original elements to their clone counterparts.
 * @returns Selection state and handlers.
 */
export const useElementSelection = (
  elementMap: RefObject<Map<Element, Element>>
): UseElementSelectionResult => {
  const { euiTheme } = useEuiTheme();
  const zIndex = useOverlayZIndex();
  const [selection, setSelection] = useState<{ element: Element | null }>({ element: null });
  const selectedElement = selection.element;
  const [color, setColor] = useState('');
  const overlayRef = useRef<HTMLElement | null>(null);

  // Clean up the selection overlay on unmount to prevent leaked DOM nodes.
  useEffect(() => {
    return () => {
      overlayRef.current?.remove();
      overlayRef.current = null;
    };
  }, []);

  const handleSelect = useCallback(
    (element: Element) => {
      const map = elementMap.current;
      if (!map) return;

      // Remove previous overlay
      if (overlayRef.current) {
        overlayRef.current.remove();
        overlayRef.current = null;
      }

      setSelection({ element });

      // Highlight the clone in the preview by placing an overlay on the
      // parent element, positioned over the clone via getBoundingClientRect.
      // We always use the parent rather than appending inside the clone
      // because void elements (img, svg) can't have children, and elements
      // with border-radius + overflow:hidden would clip the overlay.
      const cloneEl = map.get(element);
      if (cloneEl instanceof HTMLElement || cloneEl instanceof SVGElement) {
        const parent = cloneEl.parentElement;
        if (parent) {
          const computedPos = window.getComputedStyle(parent).position;
          if (!computedPos || computedPos === 'static') {
            parent.style.position = 'relative';
          }

          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.pointerEvents = 'none';
          overlay.style.zIndex = String(zIndex.highlight);
          overlay.style.boxSizing = 'border-box';

          // getBoundingClientRect() returns screen-space (post-transform)
          // coordinates, but absolute positioning uses the parent's layout
          // coordinate space (pre-transform). When the parent has a scale()
          // transform, we must divide by the scale factor to convert.
          // The border width is also compensated so it appears as 2px
          // visually regardless of the parent's scale.
          const parentRect = parent.getBoundingClientRect();
          const cloneRect = cloneEl.getBoundingClientRect();
          const scaleX = parentRect.width ? parentRect.width / parent.offsetWidth : 1;
          const scaleY = parentRect.height ? parentRect.height / parent.offsetHeight : 1;
          const borderWidth = 2 / Math.max(scaleX, scaleY);

          overlay.style.border = `${borderWidth}px solid ${euiTheme.colors.primary}`;
          overlay.style.left = `${(cloneRect.left - parentRect.left) / scaleX}px`;
          overlay.style.top = `${(cloneRect.top - parentRect.top) / scaleY}px`;
          overlay.style.width = `${cloneRect.width / scaleX}px`;
          overlay.style.height = `${cloneRect.height / scaleY}px`;

          parent.appendChild(overlay);
          overlayRef.current = overlay;
        }
      }

      // Show current background color
      if (element instanceof HTMLElement) {
        const cloneCounterpart = map.get(element);
        const target = cloneCounterpart instanceof HTMLElement ? cloneCounterpart : element;
        // Use getComputedStyle to resolve CSS var() references
        // (e.g. var(--dt-accent, #ee72a6)) to actual RGB values.
        const bg = getComputedStyle(target).backgroundColor;
        setColor(isTransparentColor(bg) ? '' : rgbToHex(bg) || bg);
      }
    },
    [euiTheme.colors.primary, zIndex.highlight, elementMap, setColor]
  );

  return { selectedElement, color, setColor, handleSelect };
};
