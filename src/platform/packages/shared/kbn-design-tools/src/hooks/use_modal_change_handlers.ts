/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import {
  reflowAfterStyleChange,
  reflowAfterTextChange,
  collectTextReflowDimensions,
  collectStyleReflowDimensions,
} from '../lib/dom/clone_element';
import { parsePx, roundPxValue } from '../lib/dom/round_px_value';
import type { DraftHistoryResult } from './use_draft_history';
import { flattenDraftEdits } from './use_draft_history';
import type { DraftEdit } from '../lib/history/draft_history';
import type { StyleChange, TextNodeChange, MediaChange } from '../lib/dom/element_registry';
import type { TextNodeEntry } from '../components/edit/modal/text_node_editor';
import type { MediaEditorEntry } from '../components/edit/modal/media_editor';

const readCloneTextValue = (
  clone: Text,
  field: 'text' | 'color' | 'fontSize' | 'fontWeight'
): string => {
  if (field === 'text') return clone.textContent ?? '';
  const parent = clone.parentElement;
  if (!parent) return '';
  const computed = getComputedStyle(parent);
  switch (field) {
    case 'color':
      return computed.color;
    case 'fontSize':
      return computed.fontSize;
    case 'fontWeight':
      return computed.fontWeight;
    default:
      return '';
  }
};

interface DimensionProp {
  property: string;
  label: string;
}

interface UseModalChangeHandlersArgs {
  selectedElement: Element | null;
  color: string;
  setColor: (color: string) => void;
  handleSelect: (element: Element) => void;
  draft: DraftHistoryResult;
  elementMapRef: MutableRefObject<Map<Element, Element>>;
  textNodeMap: MutableRefObject<Array<{ original: Text; clone: Text }>>;
  mediaMap: MutableRefObject<Array<{ original: Element; clone: Element; attribute: string }>>;
  cloneRef: MutableRefObject<HTMLElement | null>;
  textEntries: TextNodeEntry[];
  setTextEntries: Dispatch<SetStateAction<TextNodeEntry[]>>;
  mediaEntries: MediaEditorEntry[];
  setMediaEntries: Dispatch<SetStateAction<MediaEditorEntry[]>>;
  dimensionProps: readonly DimensionProp[];
  onSave: (
    styleChanges: StyleChange[],
    textChanges: TextNodeChange[],
    mediaChanges: MediaChange[]
  ) => void;
}

interface UseModalChangeHandlersResult {
  handleColorChange: (newColor: string) => void;
  handleDimensionChange: (property: string, rawValue: string) => void;
  handleDimensionFocus: () => void;
  handleTextNodeChange: (
    index: number,
    updates: { text?: string; color?: string; fontSize?: string; fontWeight?: string }
  ) => void;
  handleTextNodeFocus: (index: number) => void;
  handleMediaChange: (index: number, value: string) => void;
  handleMediaFocus: (index: number) => void;
  handleSave: () => void;
  handleDraftUndo: () => void;
  handleDraftRedo: () => void;
  originalDimensionsRef: MutableRefObject<Map<HTMLElement, Map<string, string>>>;
}

/**
 * Extracts all change handlers from the edit modal into a single hook.
 * Covers color, dimension, text, media editing, undo/redo, and save.
 */
export const useModalChangeHandlers = ({
  selectedElement,
  color,
  setColor,
  handleSelect,
  draft,
  elementMapRef,
  textNodeMap,
  mediaMap,
  cloneRef,
  textEntries,
  setTextEntries,
  mediaEntries,
  setMediaEntries,
  dimensionProps,
  onSave,
}: UseModalChangeHandlersArgs): UseModalChangeHandlersResult => {
  const originalDimensionsRef = useRef(new Map<HTMLElement, Map<string, string>>());

  useEffect(() => {
    if (!selectedElement || !(selectedElement instanceof HTMLElement)) return;
    if (!originalDimensionsRef.current.has(selectedElement)) {
      const computed = getComputedStyle(selectedElement);
      const dims = new Map<string, string>();
      for (const { property } of dimensionProps) {
        dims.set(property, computed.getPropertyValue(property));
      }
      dims.set('overflow', computed.getPropertyValue('overflow'));
      originalDimensionsRef.current.set(selectedElement, dims);
    }
  }, [selectedElement, dimensionProps]);

  const refreshOverlay = useCallback(() => {
    if (selectedElement) {
      requestAnimationFrame(() => {
        handleSelect(selectedElement);
      });
    }
  }, [selectedElement, handleSelect]);

  const refreshOverlayRef = useRef(refreshOverlay);
  refreshOverlayRef.current = refreshOverlay;

  const handleColorChange = useCallback(
    (newColor: string) => {
      if (!(selectedElement instanceof HTMLElement)) return;
      const cloneEl = elementMapRef.current.get(selectedElement);
      if (!(cloneEl instanceof HTMLElement)) return;

      const currentColor = color || '';
      if (currentColor === newColor) return;

      draft.push({
        type: 'style',
        label: 'Color',
        element: selectedElement,
        cloneElement: cloneEl,
        property: 'backgroundColor',
        before: currentColor,
        after: newColor,
      });
      setColor(newColor);
    },
    [selectedElement, color, setColor, draft, elementMapRef]
  );

  const handleDimensionChange = useCallback(
    (property: string, rawValue: string) => {
      if (!(selectedElement instanceof HTMLElement)) return;
      const value = roundPxValue(rawValue);
      const cloneEl = elementMapRef.current.get(selectedElement);
      if (!(cloneEl instanceof HTMLElement)) return;

      const computed = getComputedStyle(cloneEl);
      const currentValue = roundPxValue(computed.getPropertyValue(property));
      if (currentValue === value) return;

      const dimensionEdit: DraftEdit = {
        type: 'style',
        label: property,
        element: selectedElement,
        cloneElement: cloneEl,
        property,
        before: currentValue,
        after: value,
      };

      if (property === 'width' || property === 'height') {
        const maxProp = property === 'width' ? 'max-width' : 'max-height';
        const currentMax = roundPxValue(computed.getPropertyValue(maxProp));
        const batch: DraftEdit[] = [dimensionEdit];

        if (currentMax !== 'none') {
          batch.push({
            type: 'style',
            label: maxProp,
            element: selectedElement,
            cloneElement: cloneEl,
            property: maxProp,
            before: currentMax,
            after: 'none',
          });
        }

        const origOverflow =
          originalDimensionsRef.current.get(selectedElement)?.get('overflow') ?? 'visible';
        if (origOverflow === 'visible') {
          const currentOverflow = roundPxValue(computed.getPropertyValue('overflow'));
          if (currentOverflow !== 'hidden') {
            batch.push({
              type: 'style',
              label: 'overflow',
              element: selectedElement,
              cloneElement: cloneEl,
              property: 'overflow',
              before: currentOverflow,
              after: 'hidden',
            });
          }
        }
        draft.pushBatch(
          batch,
          collectStyleReflowDimensions(
            cloneEl,
            property,
            cloneRef.current?.firstElementChild as HTMLElement | null
          )
        );
      } else {
        const batch: DraftEdit[] = [dimensionEdit];

        // For padding on border-box elements, the frozen width/height
        // includes padding. Compensate by adjusting width/height by the
        // padding delta so the content area stays stable.
        if (property === 'padding' && computed.boxSizing === 'border-box') {
          const oldPx = parsePx(currentValue);
          const newPx = parsePx(value);
          const delta = (newPx - oldPx) * 2;
          if (delta !== 0) {
            const currentW = parsePx(computed.width);
            const currentH = parsePx(computed.height);
            const adjustedW = `${Math.max(0, currentW + delta)}px`;
            const adjustedH = `${Math.max(0, currentH + delta)}px`;
            batch.push({
              type: 'style',
              label: 'width',
              element: selectedElement,
              cloneElement: cloneEl,
              property: 'width',
              before: roundPxValue(computed.width),
              after: adjustedW,
            });
            batch.push({
              type: 'style',
              label: 'height',
              element: selectedElement,
              cloneElement: cloneEl,
              property: 'height',
              before: roundPxValue(computed.height),
              after: adjustedH,
            });
          }
        }

        draft.pushBatch(
          batch,
          collectStyleReflowDimensions(
            cloneEl,
            property,
            cloneRef.current?.firstElementChild as HTMLElement | null
          )
        );
      }

      reflowAfterStyleChange(
        cloneEl,
        property,
        cloneRef.current?.firstElementChild as HTMLElement | null
      );
      refreshOverlayRef.current();
    },
    [selectedElement, draft, elementMapRef, cloneRef, originalDimensionsRef]
  );

  const handleDimensionFocus = useCallback(() => {
    if (selectedElement) {
      handleSelect(selectedElement);
    }
  }, [selectedElement, handleSelect]);

  const handleTextNodeChange = useCallback(
    (
      index: number,
      updates: { text?: string; color?: string; fontSize?: string; fontWeight?: string }
    ) => {
      const mapping = textNodeMap.current[index];
      if (!mapping) return;

      const edits: DraftEdit[] = [];
      const fields = ['text', 'color', 'fontSize', 'fontWeight'] as const;
      for (const field of fields) {
        const value = updates[field];
        if (value === undefined) continue;
        const current = readCloneTextValue(mapping.clone, field);
        if (current === value) continue;

        edits.push({
          type: 'text',
          label: field,
          index,
          originalNode: mapping.original,
          cloneNode: mapping.clone,
          field,
          before: current,
          after: value,
        });
      }

      const needsReflow =
        updates.text !== undefined ||
        updates.fontSize !== undefined ||
        updates.fontWeight !== undefined;
      const cloneParent = mapping.clone.parentElement;
      const dims =
        needsReflow && cloneParent instanceof HTMLElement
          ? collectTextReflowDimensions(cloneParent)
          : undefined;

      if (edits.length === 1) draft.push(edits[0], dims);
      else if (edits.length > 1) draft.pushBatch(edits, dims);

      if (needsReflow && cloneParent instanceof HTMLElement) {
        reflowAfterTextChange(cloneParent);
      }

      setTextEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...updates } : e)));
      refreshOverlayRef.current();
    },
    [draft, textNodeMap, setTextEntries]
  );

  const handleTextNodeFocus = useCallback(
    (index: number) => {
      const entry = textEntries[index];
      if (!entry) return;
      const parentEl = entry.node.parentElement;
      if (parentEl) {
        handleSelect(parentEl);
      }
    },
    [textEntries, handleSelect]
  );

  const handleMediaChange = useCallback(
    (index: number, value: string) => {
      const mapping = mediaMap.current[index];
      if (!mapping) return;

      const currentValue = mapping.clone.getAttribute(mapping.attribute) ?? '';
      if (currentValue === value) return;

      draft.push({
        type: 'media',
        label: 'Media',
        index,
        originalElement: mapping.original,
        cloneElement: mapping.clone,
        attribute: mapping.attribute,
        before: currentValue,
        after: value,
      });

      setMediaEntries((prev) => prev.map((e, i) => (i === index ? { ...e, value } : e)));
    },
    [draft, mediaMap, setMediaEntries]
  );

  const handleMediaFocus = useCallback(
    (index: number) => {
      const entry = mediaEntries[index];
      if (!entry) return;
      handleSelect(entry.element);
    },
    [mediaEntries, handleSelect]
  );

  const syncUiAfterDraft = useCallback(
    (edit: DraftEdit, direction: 'undo' | 'redo') => {
      const value = direction === 'undo' ? edit.before : edit.after;

      switch (edit.type) {
        case 'style':
          if (edit.property === 'backgroundColor') {
            setColor(value);
          }
          break;
        case 'text':
          setTextEntries((prev) =>
            prev.map((e, i) => (i === edit.index ? { ...e, [edit.field]: value } : e))
          );
          break;
        case 'media':
          setMediaEntries((prev) => prev.map((e, i) => (i === edit.index ? { ...e, value } : e)));
          break;
      }
      refreshOverlayRef.current();
    },
    [setColor, setTextEntries, setMediaEntries]
  );

  const handleDraftUndo = useCallback(() => {
    const edit = draft.undo();
    if (edit) syncUiAfterDraft(edit, 'undo');
  }, [draft, syncUiAfterDraft]);

  const handleDraftRedo = useCallback(() => {
    const edit = draft.redo();
    if (edit) syncUiAfterDraft(edit, 'redo');
  }, [draft, syncUiAfterDraft]);

  const handleSave = useCallback(() => {
    const { styleEdits, textEdits, mediaEdits } = flattenDraftEdits(draft.edits);

    const styleChanges: StyleChange[] = styleEdits.map((e) => ({
      element: e.element,
      property: e.property,
      value: e.after,
    }));

    const textChanges: TextNodeChange[] = [];
    const textByIndex = new Map<number, Record<string, string>>();
    for (const e of textEdits) {
      const existing = textByIndex.get(e.index) ?? {};
      existing[e.field] = e.after;
      textByIndex.set(e.index, existing);
    }
    for (const [idx, fields] of textByIndex) {
      const mapping = textNodeMap.current[idx];
      if (!mapping) continue;
      textChanges.push({ node: mapping.original, ...fields });
    }

    const mediaChanges: MediaChange[] = mediaEdits.map((e) => ({
      element: e.originalElement,
      attribute: e.attribute,
      value: e.after,
    }));

    onSave(styleChanges, textChanges, mediaChanges);
  }, [draft.edits, onSave, textNodeMap]);

  return {
    handleColorChange,
    handleDimensionChange,
    handleDimensionFocus,
    handleTextNodeChange,
    handleTextNodeFocus,
    handleMediaChange,
    handleMediaFocus,
    handleSave,
    handleDraftUndo,
    handleDraftRedo,
    originalDimensionsRef,
  };
};
