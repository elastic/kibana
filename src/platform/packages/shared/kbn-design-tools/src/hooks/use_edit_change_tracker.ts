/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { useCallback } from 'react';
import { setImportant } from '../lib/dom/clone_element';
import { replaceIconContent } from '../lib/eui_icon_cache';
import type { ElementRegistry } from '../lib/dom/element_registry';
import type {
  StyleChange,
  TextNodeChange,
  SourceChange,
} from '../components/edit/modal/edit_modal';

/**
 * Tracks style, text, and source attribute edits applied via the edit modal.
 *
 * All edits are stored on the target's `ElementSession`. If no session exists
 * yet (the element hasn't been dragged/duplicated), a lightweight edit-only
 * session is auto-created via `registry.getOrCreate` — the element is NOT
 * cloned or hidden.
 *
 * Revert is handled per-session by `ElementRegistry.resetAll` /
 * `removeSession`, so there is no separate `revertAll` here.
 */
export const useEditChangeTracker = (registryRef: MutableRefObject<ElementRegistry>) => {
  /** Total number of tracked edits across all sessions. */
  const editCount = useCallback(() => {
    let count = 0;
    for (const session of registryRef.current.values()) {
      count += session.styleEdits.length + session.textEdits.length + session.sourceEdits.length;
    }
    return count;
  }, [registryRef]);

  /**
   * Apply modal edits to the DOM and record undo state on the session.
   * Auto-registers a lightweight session if the target isn't managed yet.
   */
  const applyEdits = useCallback(
    (
      target: HTMLElement,
      savedStyleChanges: StyleChange[],
      savedTextChanges: TextNodeChange[],
      savedSourceChanges: SourceChange[]
    ) => {
      const session = registryRef.current.getOrCreate(target);
      const { styleEdits, textEdits, sourceEdits } = session;

      for (const { element, property, value } of savedStyleChanges) {
        const cssProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        const original = element.style.getPropertyValue(cssProp);
        const originalPriority = element.style.getPropertyPriority(cssProp);
        styleEdits.push({ element, property: cssProp, original, originalPriority });
        setImportant(element, cssProp, value);
      }

      for (const { node, text, color: textColor, fontSize, fontWeight } of savedTextChanges) {
        if (text !== undefined) {
          textEdits.push({ node, original: node.textContent ?? '' });
          node.textContent = text;
        }
        if (textColor !== undefined && node.parentElement) {
          const parent = node.parentElement;
          const originalColor = parent.style.color;
          const originalFill = parent.style.getPropertyValue('-webkit-text-fill-color');
          styleEdits.push({
            element: parent,
            property: 'color',
            original: originalColor,
            originalPriority: parent.style.getPropertyPriority('color'),
          });
          styleEdits.push({
            element: parent,
            property: '-webkit-text-fill-color',
            original: originalFill,
            originalPriority: parent.style.getPropertyPriority('-webkit-text-fill-color'),
          });
          setImportant(parent, 'color', textColor);
          setImportant(parent, '-webkit-text-fill-color', textColor);
        }
        if (fontSize !== undefined && node.parentElement) {
          const parent = node.parentElement;
          styleEdits.push({
            element: parent,
            property: 'font-size',
            original: parent.style.getPropertyValue('font-size'),
            originalPriority: parent.style.getPropertyPriority('font-size'),
          });
          setImportant(parent, 'font-size', fontSize);
        }
        if (fontWeight !== undefined && node.parentElement) {
          const parent = node.parentElement;
          styleEdits.push({
            element: parent,
            property: 'font-weight',
            original: parent.style.getPropertyValue('font-weight'),
            originalPriority: parent.style.getPropertyPriority('font-weight'),
          });
          setImportant(parent, 'font-weight', fontWeight);
        }
      }

      for (const { element, attribute, value } of savedSourceChanges) {
        const original = element.getAttribute(attribute) ?? '';
        sourceEdits.push({ element, attribute, original });
        if (attribute === 'data-icon-type') {
          replaceIconContent(element, value);
        } else {
          element.setAttribute(attribute, value);
        }
      }
    },
    [registryRef]
  );

  return { editCount, applyEdits };
};
