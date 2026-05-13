/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { useCallback, useState } from 'react';
import { rgbToHex, useEuiTheme } from '@elastic/eui';
import { isTransparentColor } from '../lib/dom/is_transparent_color';

interface UseElementSelectionResult {
  selectedElement: Element | null;
  color: string;
  setColor: (color: string) => void;
  handleSelect: (element: Element) => void;
}

/**
 * Manages element selection state in the edit modal: tracks the selected element,
 * highlights its clone in the preview, and reads its background color.
 */
export const useElementSelection = (
  elementMap: React.RefObject<Map<Element, Element>>
): UseElementSelectionResult => {
  const { euiTheme } = useEuiTheme();
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [color, setColor] = useState('');

  const handleSelect = useCallback(
    (element: Element) => {
      const map = elementMap.current;
      if (!map) return;

      // Remove previous highlight
      if (selectedElement) {
        const prevClone = map.get(selectedElement);
        if (prevClone instanceof HTMLElement) {
          prevClone.style.outline = '';
        }
      }

      setSelectedElement(element);

      // Highlight in preview
      const cloneEl = map.get(element);
      if (cloneEl instanceof HTMLElement) {
        cloneEl.style.outline = `2px solid ${euiTheme.colors.primary}`;
      }

      // Show current background color
      if (element instanceof HTMLElement) {
        const cloneCounterpart = map.get(element);
        const bg =
          cloneCounterpart instanceof HTMLElement
            ? cloneCounterpart.style.backgroundColor
            : element.style.backgroundColor;
        setColor(isTransparentColor(bg) ? '' : rgbToHex(bg) || bg);
      }
    },
    [selectedElement, euiTheme.colors.primary, elementMap, setColor]
  );

  return { selectedElement, color, setColor, handleSelect };
};
