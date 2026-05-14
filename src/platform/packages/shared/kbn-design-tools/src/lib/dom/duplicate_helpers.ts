/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DUPLICATE_OFFSET } from '../constants';
import { cloneClean, setImportant, roundRect } from './clone_element';
import type { ElementSession, ElementRegistry } from './element_registry';
import { buildTransform } from './resize_helpers';
import { renderEuiComponentLive } from './insert_element';

/**
 * Transfer user edits (inline style overrides and text content changes)
 * from a source element tree to a freshly rendered live duplicate.
 *
 * Live elements use Emotion classes — any inline styles on child elements
 * are edit overrides applied by the user. Text nodes may also have been
 * modified. Walk both trees in parallel and copy these changes.
 */
const transferDomEdits = (source: HTMLElement, target: HTMLElement): void => {
  const sourceEls = source.querySelectorAll<HTMLElement>('*');
  const targetEls = target.querySelectorAll<HTMLElement>('*');

  for (let i = 0; i < sourceEls.length && i < targetEls.length; i++) {
    const src = sourceEls[i];
    const tgt = targetEls[i];

    // Copy inline style overrides
    if (src.style.length > 0) {
      for (let j = 0; j < src.style.length; j++) {
        const prop = src.style[j];
        tgt.style.setProperty(prop, src.style.getPropertyValue(prop), src.style.getPropertyPriority(prop));
      }
    }

    // Copy text node changes
    for (let j = 0; j < src.childNodes.length && j < tgt.childNodes.length; j++) {
      const srcNode = src.childNodes[j];
      const tgtNode = tgt.childNodes[j];
      if (srcNode.nodeType === Node.TEXT_NODE && tgtNode.nodeType === Node.TEXT_NODE) {
        if (srcNode.textContent !== tgtNode.textContent) {
          tgtNode.textContent = srcNode.textContent;
        }
      }
    }
  }
};

/**
 * Create a duplicate of the hovered element and register it in the registry.
 * Returns the new element so the caller can update hover state.
 */
export const createDuplicate = (
  hoverTarget: HTMLElement,
  registry: ElementRegistry,
  cloneZIndex: number
): HTMLElement => {
  const existingSession = registry.get(hoverTarget);
  const sourceEl = existingSession ? existingSession.el : hoverTarget;

  const sourceDw = existingSession?.dw ?? 0;
  const sourceDh = existingSession?.dh ?? 0;

  const liveInfo = existingSession?.liveReactElement;

  let duplicate: HTMLElement;
  let rect: DOMRect;

  if (liveInfo) {
    // Create a fresh live instance for interactivity, then transfer any
    // user edits (inline style overrides, text changes) from the source.
    const live = renderEuiComponentLive(liveInfo.element, liveInfo.zIndex);
    duplicate = live.wrapper;
    rect = live.rect;
    duplicate.style.transformOrigin = '0 0';
    transferDomEdits(sourceEl, duplicate);
  } else {
    const cloned = cloneClean(sourceEl, cloneZIndex);
    duplicate = cloned.clone;
    rect = cloned.rect;
    duplicate.style.transformOrigin = '0 0';
    duplicate.style.pointerEvents = 'auto';
    document.body.appendChild(duplicate);
  }

  // When duplicating a managed clone the visual position (sourceRect)
  // differs from the untransformed position (rect) returned by cloneClean
  // because cloneClean strips the transform before measuring.  Position
  // the duplicate at the visual location and use a corrected rect so
  // session.originalRect matches the actual left/top we set.
  const sourceRect = roundRect(sourceEl.getBoundingClientRect());
  // Position the duplicate at the rounded visual location.
  duplicate.style.left = `${sourceRect.left}px`;
  duplicate.style.top = `${sourceRect.top}px`;

  const correctedRect = new DOMRect(sourceRect.left, sourceRect.top, rect.width, rect.height);

  const scaleX = (rect.width + sourceDw) / rect.width;
  const scaleY = (rect.height + sourceDh) / rect.height;
  const initialTransform = buildTransform(DUPLICATE_OFFSET, DUPLICATE_OFFSET, scaleX, scaleY);
  setImportant(duplicate, 'transform', initialTransform);

  const session: ElementSession = {
    el: duplicate,
    dx: DUPLICATE_OFFSET,
    dy: DUPLICATE_OFFSET,
    dw: sourceDw,
    dh: sourceDh,
    originalRect: correctedRect,
    isDuplicate: true,
    // Live elements (inserted without a page reference) should keep
    // referenceEl undefined so useScrollSync treats them as free-floating.
    // Static clones need referenceEl for scroll tracking.
    referenceEl: liveInfo ? existingSession?.referenceEl : existingSession?.referenceEl ?? hoverTarget,
    liveReactElement: liveInfo,
  };
  registry.set(session);

  return duplicate;
};
