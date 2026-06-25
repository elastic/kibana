/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEVTOOL_HIDDEN_ATTR,
  DEVTOOL_MANAGED_ATTR,
  DEVTOOL_CLONE_HIDDEN_ATTR,
} from '../lib/constants';
import {
  copyCanvasContent,
  copyStylesDeep,
  deduplicateSvgIds,
  roundRect,
  widenForTruncation,
} from './clone_element';
import { isLiveElement } from './managed_element';
import { setImportant } from '../lib/dom/set_important';

interface PreviewCloneResult {
  clone: HTMLElement;
  elementMap: Map<Element, Element>;
}

/**
 * Strip the translate() from a transform string, keeping everything else (e.g. scale()).
 * Uses a balanced-parentheses approach to handle nested functions like calc().
 */
const stripTranslate = (transform: string): string => {
  if (!transform || transform === 'none') return 'none';
  let result = '';
  let i = 0;
  while (i < transform.length) {
    const translateMatch = transform.slice(i).match(/^translate[XYZ3d]*\s*\(/);
    if (translateMatch) {
      let depth = 0;
      let j = i + translateMatch[0].length - 1;
      for (; j < transform.length; j++) {
        if (transform[j] === '(') depth++;
        else if (transform[j] === ')') {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      i = j;
      while (i < transform.length && transform[i] === ' ') i++;
    } else {
      result += transform[i];
      i++;
    }
  }
  return result.trim() || 'none';
};

/**
 * Creates a clone of the target element for the preview panel.
 *
 * If the target is a managed clone (has DEVTOOL_MANAGED_ATTR), it already has
 * all computed styles inlined, so a plain cloneNode(true) is enough.
 * For original DOM elements, copyStylesDeep captures computed styles.
 *
 * @param target - The element to clone for the preview.
 * @returns The clone, element map, and text node map.
 */
export const createPreviewClone = (target: HTMLElement): PreviewCloneResult => {
  const isManaged = target.hasAttribute(DEVTOOL_MANAGED_ATTR);
  const isLive = isLiveElement(target);
  // Visual dimensions (post-transform): what the user actually sees
  let visualRect = roundRect(target.getBoundingClientRect());

  const cloneNode = target.cloneNode(true);
  if (!(cloneNode instanceof HTMLElement)) {
    return { clone: target, elementMap: new Map() };
  }
  const clone = cloneNode;
  copyCanvasContent(target, clone);
  deduplicateSvgIds(clone);

  const needsInlinedStyles = !isManaged || isLive;
  if (needsInlinedStyles) {
    // Non-managed elements need styles inlined. Live elements are managed
    // but use Emotion CSS classes instead of inlined styles, so they also
    // need copyStylesDeep to avoid inheriting wrong theme values in the
    // dark-mode edit modal.
    copyStylesDeep(target, clone);
    // Original elements may have relative sizing (width:100% etc.), so pin to actual size
    setImportant(clone, 'width', `${visualRect.width}px`);
    setImportant(clone, 'height', `${visualRect.height}px`);
    setImportant(clone, 'box-sizing', 'border-box');
  }

  // Fix positioning for preview layout. Uses setImportant to override any
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
  // Children with DEVTOOL_HIDDEN_ATTR or data-clone-hidden remain hidden.
  // They were soft-deleted by the user and the preview should reflect the
  // current editing state.
  // Collect hidden subtree roots first so descendants are not accidentally
  // made visible (CSS visibility:visible on a child overrides the parent).
  const hiddenRoots = clone.querySelectorAll<HTMLElement>(
    `[${DEVTOOL_HIDDEN_ATTR}], [${DEVTOOL_CLONE_HIDDEN_ATTR}]`
  );
  const insideHidden = new Set<Element>();
  for (const root of hiddenRoots) {
    for (const desc of root.querySelectorAll('*')) {
      insideHidden.add(desc);
    }
  }

  clone.removeAttribute(DEVTOOL_HIDDEN_ATTR);
  clone.removeAttribute(DEVTOOL_MANAGED_ATTR);
  for (const child of clone.querySelectorAll<HTMLElement>('*')) {
    const isHidden =
      child.hasAttribute(DEVTOOL_HIDDEN_ATTR) || child.hasAttribute(DEVTOOL_CLONE_HIDDEN_ATTR);
    child.removeAttribute(DEVTOOL_MANAGED_ATTR);
    child.removeAttribute(DEVTOOL_HIDDEN_ATTR);
    child.removeAttribute(DEVTOOL_CLONE_HIDDEN_ATTR);
    const isVisibleChild = !isHidden && !insideHidden.has(child);
    if (isVisibleChild) {
      if (child.style.visibility === 'hidden') child.style.visibility = 'visible';
      if (child.style.opacity === '0') child.style.opacity = '1';
    }
  }

  // copyStylesDeep strips truncation classes from the clone tree, so
  // text that was clipped may now be wider than the pinned dimensions.
  visualRect = widenForTruncation(target, clone, visualRect);

  // CSS transform: scale() doesn't change the element's layout box. The
  // scaled visual overflows the layout dimensions. Wrap in a container
  // that is at least as large as the visual (post-scale) dimensions so
  // the preview layout accounts for the actual rendered size, but can
  // grow when dimension edits make the clone wider/taller.
  const wrapper = document.createElement('div');
  wrapper.style.minWidth = `${visualRect.width}px`;
  wrapper.style.minHeight = `${visualRect.height}px`;
  wrapper.style.width = 'fit-content';
  wrapper.style.position = 'relative';
  wrapper.style.margin = '0 auto';
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
