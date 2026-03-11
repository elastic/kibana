/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Base index representing "today" (current month).
 * Using a high value allows prepending past months without going negative.
 */
export const TODAY_INDEX = 100000;

/**
 * Number of months mounted in the non-virtualized scrolling window.
 * Larger values reduce chunk-shift frequency at the cost of more DOM nodes.
 */
export const CALENDAR_WINDOW_MONTHS = 36;

/** Half of CALENDAR_WINDOW_MONTHS, used for centering target month in the initial view. */
export const HALF_CALENDAR_WINDOW_MONTHS = CALENDAR_WINDOW_MONTHS / 2;

/**
 * Number of months to shift when the user scrolls near either edge.
 * Keeping this smaller than CALENDAR_WINDOW_MONTHS preserves a stable viewport.
 */
export const CALENDAR_SHIFT_MONTHS = 12;

/**
 * Pixel threshold from the top/bottom edge at which the calendar shifts month chunks.
 */
export const CALENDAR_SCROLL_EDGE_THRESHOLD = 120;

/**
 * Fallback intrinsic month height used by CSS `content-visibility`.
 * The browser uses this size before a month is actually rendered.
 */
export const CALENDAR_MONTH_ESTIMATED_HEIGHT = 280;
