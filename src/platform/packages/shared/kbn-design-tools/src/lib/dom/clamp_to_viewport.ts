/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LABEL_PADDING } from '../constants';

interface ClampedPosition {
  left: number;
  top: number;
}

/**
 * Clamp a label position so it stays fully within the viewport.
 * The label is assumed to be a small fixed-position element.
 *
 * @param left - Desired left position (px)
 * @param top - Desired top position (px)
 * @param labelWidth - Estimated or measured label width (px)
 * @param labelHeight - Estimated or measured label height (px)
 */
export const clampToViewport = (
  left: number,
  top: number,
  labelWidth: number,
  labelHeight: number
): ClampedPosition => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  return {
    left: Math.max(LABEL_PADDING, Math.min(left, vw - labelWidth - LABEL_PADDING)),
    top: Math.max(LABEL_PADDING, Math.min(top, vh - labelHeight - LABEL_PADDING)),
  };
};
