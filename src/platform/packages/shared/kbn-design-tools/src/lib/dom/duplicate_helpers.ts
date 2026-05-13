/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DUPLICATE_OFFSET } from '../constants';
import { cloneClean, setImportant } from './clone_element';
import type { ElementSession, ElementRegistry } from './element_registry';
import { buildTransform } from './resize_helpers';

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

  const { clone: duplicate, rect } = cloneClean(sourceEl, cloneZIndex);
  duplicate.style.transformOrigin = '0 0';
  duplicate.style.pointerEvents = 'auto';
  document.body.appendChild(duplicate);

  // When duplicating a managed clone the visual position (sourceRect)
  // differs from the untransformed position (rect) returned by cloneClean
  // because cloneClean strips the transform before measuring.  Position
  // the duplicate at the visual location and use a corrected rect so
  // session.originalRect matches the actual left/top we set.
  const sourceRect = sourceEl.getBoundingClientRect();
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
  };
  registry.set(session);

  return duplicate;
};
