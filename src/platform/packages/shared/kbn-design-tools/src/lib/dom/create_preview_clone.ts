/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_HIDDEN_ATTR, DEVTOOL_MANAGED_ATTR } from '../constants';
import { copyCanvasContent, copyStylesDeep, setImportant, roundRect } from './clone_element';

export interface PreviewCloneResult {
  clone: HTMLElement;
  elementMap: Map<Element, Element>;
}

/**
 * Strip the translate() from a transform string, keeping everything else (e.g. scale()).
 */
const stripTranslate = (transform: string): string => {
  if (!transform || transform === 'none') return 'none';
  const stripped = transform.replace(/translate\([^)]*\)\s*/g, '').trim();
  return stripped || 'none';
};

/**
 * Create a clone of the target element for the preview panel.
 *
 * If the target is a managed clone (has DEVTOOL_MANAGED_ATTR), it already has
 * all computed styles inlined — a plain cloneNode(true) is enough.
 * If it's an original DOM element, we run copyStylesDeep to capture computed styles.
 */
export const createPreviewClone = (target: HTMLElement): PreviewCloneResult => {
  const isManaged = target.hasAttribute(DEVTOOL_MANAGED_ATTR);
  // Visual dimensions (post-transform) — what the user actually sees
  const visualRect = roundRect(target.getBoundingClientRect());

  const clone = target.cloneNode(true) as HTMLElement;
  copyCanvasContent(target, clone);

  if (!isManaged) {
    copyStylesDeep(target, clone);
    // Original elements may have relative sizing (width:100% etc.) — pin to actual size
    setImportant(clone, 'width', `${visualRect.width}px`);
    setImportant(clone, 'height', `${visualRect.height}px`);
    setImportant(clone, 'box-sizing', 'border-box');
  }

  // Fix positioning for preview layout — setImportant to override any
  // !important inline styles from drag/resize
  const scale = stripTranslate(target.style.getPropertyValue('transform'));
  setImportant(clone, 'position', 'relative');
  setImportant(clone, 'left', '0');
  setImportant(clone, 'top', '0');
  setImportant(clone, 'right', 'auto');
  setImportant(clone, 'bottom', 'auto');
  setImportant(clone, 'margin', '0');
  setImportant(clone, 'z-index', 'auto');
  setImportant(clone, 'transform-origin', '0 0');
  setImportant(clone, 'transform', scale);
  setImportant(clone, 'transition', 'none');
  setImportant(clone, 'pointer-events', 'none');
  setImportant(clone, 'visibility', 'visible');
  setImportant(clone, 'opacity', '1');

  // Strip devtool markers from the clone root.
  // Children with DEVTOOL_HIDDEN_ATTR remain hidden — they were soft-deleted
  // by the user and the preview should reflect the current editing state.
  clone.removeAttribute(DEVTOOL_HIDDEN_ATTR);
  clone.removeAttribute(DEVTOOL_MANAGED_ATTR);
  for (const child of clone.querySelectorAll<HTMLElement>('*')) {
    const isHidden = child.hasAttribute(DEVTOOL_HIDDEN_ATTR);
    child.removeAttribute(DEVTOOL_MANAGED_ATTR);
    if (isHidden) {
      // Keep hidden children invisible — only strip the marker attribute
      child.removeAttribute(DEVTOOL_HIDDEN_ATTR);
    } else {
      if (child.style.visibility === 'hidden') child.style.visibility = 'visible';
      if (child.style.opacity === '0') child.style.opacity = '1';
    }
  }

  // CSS transform: scale() doesn't change the element's layout box — the
  // scaled visual overflows the layout dimensions. Wrap in a container sized
  // to the visual (post-scale) dimensions so the preview layout accounts
  // for the actual rendered size.
  const wrapper = document.createElement('div');
  wrapper.style.width = `${visualRect.width}px`;
  wrapper.style.height = `${visualRect.height}px`;
  wrapper.style.position = 'relative';
  wrapper.style.margin = '0 auto';
  wrapper.style.overflow = 'hidden';
  wrapper.appendChild(clone);

  const elementMap = new Map<Element, Element>();
  const originals = target.querySelectorAll('*');
  const clones = clone.querySelectorAll('*');
  elementMap.set(target, clone);
  for (let i = 0; i < originals.length && i < clones.length; i++) {
    elementMap.set(originals[i], clones[i]);
  }

  return { clone: wrapper, elementMap };
};
