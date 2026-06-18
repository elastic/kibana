/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MIN_SIDE_PANEL_WIDTH = 180;
const MAX_SIDE_PANEL_WIDTH_PERCENT = 0.4;

/** How far past the minimum (in px) a drag can go before collapsing on release. */
export const SIDE_PANEL_COLLAPSE_DRAG_RANGE = 48;

/** Maximum overscroll stretch (in px) shown on the resize indicator at min/max limits. */
export const SIDE_PANEL_INDICATOR_STRETCH_MAX = 20;

/** Default width of the resize indicator highlight band. */
export const SIDE_PANEL_INDICATOR_BASE_WIDTH = 16;

export const SIDE_PANEL_COLLAPSE_THRESHOLD =
  MIN_SIDE_PANEL_WIDTH - SIDE_PANEL_COLLAPSE_DRAG_RANGE;

export function getMaxSidePanelWidth(): number {
  return Math.max(
    MIN_SIDE_PANEL_WIDTH,
    Math.floor(window.innerWidth * MAX_SIDE_PANEL_WIDTH_PERCENT)
  );
}

export function clampSidePanelWidth(width: number): number {
  width = Math.floor(width);
  return Math.max(MIN_SIDE_PANEL_WIDTH, Math.min(getMaxSidePanelWidth(), width));
}

export type SidePanelWidthResolution = { type: 'collapse' } | { type: 'width'; width: number };

export interface SidePanelDragIndicatorState {
  primaryX: number;
  stretchLeft: number;
  stretchRight: number;
}

/**
 * Computes resize-indicator position during a drag. The primary line follows the cursor
 * within valid bounds; at min/max limits it stays on the boundary while the background
 * band stretches toward the cursor up to {@link SIDE_PANEL_INDICATOR_STRETCH_MAX}.
 */
export function getSidePanelDragIndicatorState(
  rawWidth: number,
  startX: number,
  startWidth: number,
  clientX: number
): SidePanelDragIndicatorState {
  const floored = Math.floor(rawWidth);
  const max = getMaxSidePanelWidth();

  if (floored < MIN_SIDE_PANEL_WIDTH) {
    return {
      primaryX: startX + (MIN_SIDE_PANEL_WIDTH - startWidth),
      stretchLeft: Math.min(SIDE_PANEL_INDICATOR_STRETCH_MAX, MIN_SIDE_PANEL_WIDTH - floored),
      stretchRight: 0,
    };
  }

  if (floored > max) {
    return {
      primaryX: startX + (max - startWidth),
      stretchLeft: 0,
      stretchRight: Math.min(SIDE_PANEL_INDICATOR_STRETCH_MAX, floored - max),
    };
  }

  return {
    primaryX: clientX,
    stretchLeft: 0,
    stretchRight: 0,
  };
}

/**
 * Returns the visible panel width during a drag. The panel never renders narrower than the
 * minimum; continued dragging below the minimum is tracked separately for collapse on release.
 */
export function applyElasticSidePanelWidth(rawWidth: number): number {
  const floored = Math.floor(rawWidth);
  const max = getMaxSidePanelWidth();

  if (floored >= MIN_SIDE_PANEL_WIDTH) {
    return Math.min(floored, max);
  }

  return MIN_SIDE_PANEL_WIDTH;
}

/**
 * Resolves the final width after a drag ends. Dragging far enough past the minimum collapses
 * the panel; releasing within the elastic zone snaps back to the minimum.
 */
export function resolveSidePanelWidthOnRelease(rawWidth: number): SidePanelWidthResolution {
  const floored = Math.floor(rawWidth);

  if (floored < SIDE_PANEL_COLLAPSE_THRESHOLD) {
    return { type: 'collapse' };
  }

  if (floored < MIN_SIDE_PANEL_WIDTH) {
    return { type: 'width', width: MIN_SIDE_PANEL_WIDTH };
  }

  return { type: 'width', width: clampSidePanelWidth(floored) };
}
