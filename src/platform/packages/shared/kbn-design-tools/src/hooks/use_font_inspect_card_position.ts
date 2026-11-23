/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, type RefObject } from 'react';
import { clampToViewport } from '../lib/dom/clamp_to_viewport';

const CARD_VERTICAL_GAP_PX = 4;

const getCenteredCardLeft = (anchorRect: DOMRect, cardWidth: number): number => {
  const elementCenterX = anchorRect.left + anchorRect.width / 2;
  const cardHalfWidth = cardWidth / 2;
  return elementCenterX - cardHalfWidth;
};

/**
 * Positions a fixed font-inspect card below and centered on an anchor rect.
 *
 * @param cardRef - Wrapper around the card (must be `position: fixed`).
 * @param anchorRect - Viewport rect to align to, or `null` to skip positioning.
 * @param repositionTrigger - Extra value that should re-run layout (e.g. hovered element).
 */
export const useFontInspectCardPosition = (
  cardRef: RefObject<HTMLDivElement | null>,
  anchorRect: DOMRect | null,
  repositionTrigger?: unknown
): void => {
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !anchorRect) {
      return;
    }

    const { width, height } = el.getBoundingClientRect();
    const desiredLeft = getCenteredCardLeft(anchorRect, width);
    const desiredTop = anchorRect.bottom + CARD_VERTICAL_GAP_PX;
    const clamped = clampToViewport(desiredLeft, desiredTop, width, height);
    el.style.left = `${clamped.left}px`;
    el.style.top = `${clamped.top}px`;
  }, [anchorRect, cardRef, repositionTrigger]);
};
