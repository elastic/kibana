/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_MONACO_LAYOUT_OPTIONS } from '@kbn/workflows-ui';

/**
 * The gap between the focused step decoration border and the editor's right edge (scrollbar area).
 * Used in both the decoration pseudo-element (`right` inset) and the step actions container
 * positioning (`translateX` offset).
 */
export const FOCUSED_STEP_DECORATION_INSET_PX = 4;

/**
 * Width of Monaco's vertical scrollbar when the step minimap is active.
 * The scrollbar is hidden (`vertical: 'hidden'`) so the minimap is the sole scroll indicator;
 * this constant is 0 to keep the `MINIMAP_RESERVE_PX` and `stepActionsContainer` formulas
 * consistent and self-documenting rather than using a bare literal.
 */
export const EDITOR_SCROLLBAR_WIDTH_PX = 0;

/**
 * Top padding inside the Monaco editor viewport.
 * Mirrors `WORKFLOW_MONACO_LAYOUT_OPTIONS.padding.top` — kept in sync here so layout
 * calculations (e.g. minimap scroll offset) don't hard-code the value separately.
 */
export const EDITOR_PADDING_TOP_PX = WORKFLOW_MONACO_LAYOUT_OPTIONS.padding?.top ?? 24;

// ── Step-minimap panel geometry ────────────────────────────────────────────
// All minimap layout constants live here so they can be imported by both the
// component and the geometry unit tests, preventing silent drift.

/** Height of each step row in the minimap (pill + SVG dot). */
export const MINIMAP_ITEM_HEIGHT = 32;

/** Radius of the SVG node circle (dot) on the rail. */
export const MINIMAP_DOT_R = 4;

/** Width of the SVG track column that holds the rail and dots. */
export const MINIMAP_TRACK_W = 32;

/** Horizontal gap between the right edge of the pill text area and the SVG track. */
export const MINIMAP_PILL_TRACK_GAP = 6;

/** Total visual width of the minimap content (label area + gap + track column). */
export const MINIMAP_WIDTH_PX = 184;

/** Maximum width of the pill text label, derived from panel geometry. */
export const MINIMAP_MAX_LABEL_W = MINIMAP_WIDTH_PX - MINIMAP_TRACK_W - MINIMAP_PILL_TRACK_GAP;

/** Height of the pill badge. */
export const MINIMAP_PILL_H = 22;

/** Border radius of the pill badge. */
export const MINIMAP_PILL_RADIUS = 11;

// Track X positions (pixels from left of the SVG track column).
// Single-track (no nesting): centred in the column.
export const MINIMAP_TRACK_X = 10;
// Two-track (nesting present). Spread wide enough that the middle connector
// lane ((outer+inner)/2) keeps clear daylight from both rails and their dots.
export const MINIMAP_OUTER_TRACK_X = 26; // top-level steps
export const MINIMAP_INNER_TRACK_X = 6; // nested steps

/** Nested pills are slightly narrower so they visually indent from parent pills. */
export const MINIMAP_NESTED_PILL_INDENT = 10;

/**
 * Extra px the viewport-indicator border's right edge extends past the track column
 * so it clears the SVG track dots. Unrelated to `MINIMAP_GAP_PX` — this is purely
 * about the border geometry, not the panel's reserved layout width.
 */
export const MINIMAP_VIEWPORT_BORDER_RIGHT_EXTRA_PX = 8;

// ── Minimap panel layout constants ─────────────────────────────────────────

/** Horizontal padding inside the minimap container on each side.
 *  Gives the viewport indicator border room so it doesn't clip the severity dots (left)
 *  or the SVG track circles (right). */
export const MINIMAP_PADDING_LEFT_PX = 16;
export const MINIMAP_PADDING_RIGHT_PX = 16;

/** Gap between the minimap panel and the editor's scrollable content area. */
export const MINIMAP_GAP_PX = 8;

/**
 * Total right-side reserve: minimap panel (both paddings + content) + gap between
 * minimap and editor + slim scrollbar.
 *
 * Derived explicitly so the relationship between the geometry constants and the
 * editor padding is visible. Content width is `MINIMAP_MAX_LABEL_W + MINIMAP_TRACK_W`
 * (the rendered div); the remaining `MINIMAP_PILL_TRACK_GAP` is internal layout spacing.
 */
export const MINIMAP_RESERVE_PX =
  MINIMAP_PADDING_LEFT_PX +
  MINIMAP_MAX_LABEL_W +
  MINIMAP_TRACK_W +
  MINIMAP_PADDING_RIGHT_PX +
  MINIMAP_GAP_PX +
  EDITOR_SCROLLBAR_WIDTH_PX;
