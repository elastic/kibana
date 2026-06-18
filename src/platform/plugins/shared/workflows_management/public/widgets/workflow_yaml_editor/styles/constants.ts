/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The gap between the focused step decoration border and the editor's right edge (scrollbar area).
 * Used in both the decoration pseudo-element (`right` inset) and the step actions container
 * positioning (`translateX` offset).
 */
export const FOCUSED_STEP_DECORATION_INSET_PX = 4;

/**
 * Approximate width (in pixels) of the vertical scrollbar area in the Monaco-based code editor.
 *
 * This value was empirically determined based on the default scrollbar rendering in supported
 * browsers/operating systems and is used for layout/positioning calculations (e.g. keeping
 * decorations and action buttons clear of the scrollbar).
 *
 * If scrollbar styling or supported environments change, this value may need adjustment.
 */
export const EDITOR_SCROLLBAR_WIDTH_PX = 14;

/** Top padding inside the Monaco editor viewport (matches editorOptions.padding.top). */
export const EDITOR_PADDING_TOP_PX = 24;

/** Width of the step minimap panel (label area + track column). */
export const MINIMAP_WIDTH_PX = 176;

/** Horizontal padding inside the minimap container on each side.
 *  Gives the viewport indicator border room so it doesn't clip the severity dots (left)
 *  or the SVG track circles (right). */
export const MINIMAP_PADDING_LEFT_PX = 16;
export const MINIMAP_PADDING_RIGHT_PX = 16;

/** Total right-side reserve: minimap + both side paddings + gap. Scrollbar is hidden. */
export const MINIMAP_RESERVE_PX = MINIMAP_WIDTH_PX + MINIMAP_PADDING_LEFT_PX + MINIMAP_PADDING_RIGHT_PX + 8;
