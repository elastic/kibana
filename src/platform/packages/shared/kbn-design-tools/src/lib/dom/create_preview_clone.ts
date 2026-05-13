/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_HIDDEN_ATTR, DEVTOOL_MANAGED_ATTR } from '../constants';
import { copyStylesDeep } from './clone_element';

export interface PreviewCloneResult {
  clone: HTMLElement;
  elementMap: Map<Element, Element>;
}

/**
 * Create a styled clone of the target element suitable for use in a preview panel.
 * Copies computed styles, strips devtool markers, and builds an original→clone element map.
 */
export const createPreviewClone = (target: HTMLElement): PreviewCloneResult => {
  const clone = target.cloneNode(true) as HTMLElement;
  copyStylesDeep(target, clone);

  clone.style.position = 'relative';
  clone.style.left = '';
  clone.style.top = '';
  clone.style.width = '';
  clone.style.height = '';
  clone.style.margin = '';
  clone.style.zIndex = '';
  clone.style.transform = 'none';
  clone.style.transition = 'none';
  clone.style.pointerEvents = 'none';
  clone.style.maxWidth = '100%';
  clone.style.maxHeight = '100%';
  clone.style.overflow = 'auto';

  // Strip devtool markers and force visibility on the entire clone tree
  clone.removeAttribute(DEVTOOL_HIDDEN_ATTR);
  clone.removeAttribute(DEVTOOL_MANAGED_ATTR);
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';
  for (const child of clone.querySelectorAll<HTMLElement>('*')) {
    child.removeAttribute(DEVTOOL_HIDDEN_ATTR);
    child.removeAttribute(DEVTOOL_MANAGED_ATTR);
    if (child.style.visibility === 'hidden') child.style.visibility = 'visible';
    if (child.style.opacity === '0') child.style.opacity = '1';
  }

  const elementMap = new Map<Element, Element>();
  const originals = target.querySelectorAll('*');
  const clones = clone.querySelectorAll('*');
  elementMap.set(target, clone);
  for (let i = 0; i < originals.length && i < clones.length; i++) {
    elementMap.set(originals[i], clones[i]);
  }

  return { clone, elementMap };
};
