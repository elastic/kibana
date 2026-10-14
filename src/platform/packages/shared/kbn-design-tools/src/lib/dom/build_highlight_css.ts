/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/css';
import { transparentize } from '@elastic/eui';

/**
 * Builds a fixed-position highlight box CSS class for a given rect and color.
 *
 * @param rect - The bounding rect to highlight.
 * @param color - The highlight color.
 * @param zIndex - The z-index for the highlight.
 * @returns A CSS class string.
 */
export const buildHighlightCss = (rect: DOMRect, color: string, zIndex: number): string =>
  css({
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    border: `2px solid ${color}`,
    backgroundColor: transparentize(color, 0.15),
    pointerEvents: 'none',
    zIndex,
  });
