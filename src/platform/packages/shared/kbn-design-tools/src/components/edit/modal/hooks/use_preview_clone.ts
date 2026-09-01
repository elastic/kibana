/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { rgbToHex } from '@elastic/eui';
import { collectAllTextNodes } from '../../../../edit_engine/collect_text_nodes';
import { collectMediaElements } from '../../../../edit_engine/collect_media_elements';
import { createPreviewClone } from '../../../../edit_engine/create_preview_clone';
import { getContentRoot } from '../../../../edit_engine/managed_element';
import { useElementSelection } from './use_element_selection';
import type { TextNodeEntry } from '../text_node_editor';
import type { MediaEditorEntry } from '../media_editor';

interface UsePreviewCloneResult {
  cloneRoot: HTMLElement | null;
  cloneRef: MutableRefObject<HTMLElement | null>;
  elementMapRef: MutableRefObject<Map<Element, Element>>;
  textNodeMap: MutableRefObject<Array<{ original: Text; clone: Text }>>;
  mediaMap: MutableRefObject<Array<{ original: Element; clone: Element; attribute: string }>>;
  textEntries: TextNodeEntry[];
  setTextEntries: Dispatch<SetStateAction<TextNodeEntry[]>>;
  mediaEntries: MediaEditorEntry[];
  setMediaEntries: Dispatch<SetStateAction<MediaEditorEntry[]>>;
  selectedElement: Element | null;
  color: string;
  setColor: (color: string) => void;
  handleSelect: (element: Element) => void;
  previewCallbackRef: (node: HTMLDivElement | null) => void;
}

/**
 * Manages the preview clone lifecycle: creates the clone, builds
 * element/text/media mappings, collects editor entries, and handles
 * initial element selection.
 *
 * @param target - The original element to clone.
 * @returns Clone state, element/text/media maps, and selection helpers.
 */
export const usePreviewClone = (target: HTMLElement): UsePreviewCloneResult => {
  const [cloneRoot, setCloneRoot] = useState<HTMLElement | null>(null);
  const elementMapRef = useRef(new Map<Element, Element>());
  const cloneRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(true);
  const textNodeMap = useRef<Array<{ original: Text; clone: Text }>>([]);
  const [textEntries, setTextEntries] = useState<TextNodeEntry[]>([]);
  const mediaMap = useRef<Array<{ original: Element; clone: Element; attribute: string }>>([]);
  const [mediaEntries, setMediaEntries] = useState<MediaEditorEntry[]>([]);

  const { selectedElement, color, setColor, handleSelect } = useElementSelection(elementMapRef);
  const handleSelectRef = useRef(handleSelect);
  handleSelectRef.current = handleSelect;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cloneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!cloneRoot) return;
    let cancelled = false;
    const collectMedia = async () => {
      const origMedia = await collectMediaElements(target);
      const cloneMedia = await collectMediaElements(cloneRoot);
      const isStale = cancelled || !mountedRef.current;
      if (isStale) return;
      const srcEntries: MediaEditorEntry[] = [];
      const srcMapping: Array<{ original: Element; clone: Element; attribute: string }> = [];
      for (let idx = 0; idx < origMedia.length; idx++) {
        const orig = origMedia[idx];
        const cl = cloneMedia[idx];
        if (!cl) continue;
        srcEntries.push({
          element: orig.element,
          attribute: orig.attribute,
          value: orig.value,
          originalValue: orig.value,
          label: orig.label,
        });
        srcMapping.push({ original: orig.element, clone: cl.element, attribute: orig.attribute });
      }
      mediaMap.current = srcMapping;
      setMediaEntries(srcEntries);
    };
    collectMedia().catch(() => {
      // Swallow errors from media collection — the entries simply won't
      // populate and the editor will show an empty media list.
    });
    return () => {
      cancelled = true;
    };
  }, [cloneRoot, target]);

  const previewCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      if (cloneRef.current) {
        cloneRef.current.remove();
        cloneRef.current = null;
      }

      const { clone, elementMap } = createPreviewClone(target);
      elementMapRef.current = elementMap;
      cloneRef.current = clone;

      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
      node.appendChild(clone);

      const origTextNodes = collectAllTextNodes(target);
      const cloneTextNodes = collectAllTextNodes(clone);

      const entries: TextNodeEntry[] = [];
      const mapping: Array<{ original: Text; clone: Text }> = [];
      for (let idx = 0; idx < origTextNodes.length; idx++) {
        const orig = origTextNodes[idx];
        const cl = cloneTextNodes[idx];
        if (!cl) continue;
        const parentEl = cl.parentElement;
        const parentStyles = parentEl ? getComputedStyle(parentEl) : null;
        const textColor = parentStyles ? rgbToHex(parentStyles.color) || '' : '';
        const fontSize = parentStyles ? parentStyles.fontSize : '';
        const fontWeight = parentStyles ? parentStyles.fontWeight : '';
        const text = cl.textContent ?? '';
        entries.push({
          node: orig,
          text,
          color: textColor,
          fontSize,
          fontWeight,
          originalText: text,
          originalColor: textColor,
          originalFontSize: fontSize,
          originalFontWeight: fontWeight,
        });
        mapping.push({ original: orig, clone: cl });
      }
      textNodeMap.current = mapping;
      setTextEntries(entries);

      setCloneRoot(clone);

      const initialSelection = getContentRoot(target);
      handleSelectRef.current(initialSelection);
    },
    [target]
  );

  return {
    cloneRoot,
    cloneRef,
    elementMapRef,
    textNodeMap,
    mediaMap,
    textEntries,
    setTextEntries,
    mediaEntries,
    setMediaEntries,
    selectedElement,
    color,
    setColor,
    handleSelect,
    previewCallbackRef,
  };
};
