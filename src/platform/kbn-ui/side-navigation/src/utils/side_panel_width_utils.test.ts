/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  applyElasticSidePanelWidth,
  clampSidePanelWidth,
  getMaxSidePanelWidth,
  getSidePanelDragIndicatorState,
  MIN_SIDE_PANEL_WIDTH,
  resolveSidePanelWidthOnRelease,
  SIDE_PANEL_COLLAPSE_THRESHOLD,
  SIDE_PANEL_INDICATOR_STRETCH_MAX,
} from './side_panel_width_utils';

describe('side_panel_width_utils', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
  });

  describe('clampSidePanelWidth', () => {
    it('clamps width to min and max bounds', () => {
      expect(clampSidePanelWidth(100)).toBe(MIN_SIDE_PANEL_WIDTH);
      expect(clampSidePanelWidth(999)).toBe(getMaxSidePanelWidth());
      expect(clampSidePanelWidth(300)).toBe(300);
    });
  });

  describe('applyElasticSidePanelWidth', () => {
    it('returns the raw width when above the minimum', () => {
      expect(applyElasticSidePanelWidth(220)).toBe(220);
    });

    it('keeps the visible width at the minimum when dragged below it', () => {
      expect(applyElasticSidePanelWidth(MIN_SIDE_PANEL_WIDTH)).toBe(MIN_SIDE_PANEL_WIDTH);
      expect(applyElasticSidePanelWidth(MIN_SIDE_PANEL_WIDTH - 20)).toBe(MIN_SIDE_PANEL_WIDTH);
      expect(applyElasticSidePanelWidth(0)).toBe(MIN_SIDE_PANEL_WIDTH);
    });
  });

  describe('resolveSidePanelWidthOnRelease', () => {
    it('snaps to the minimum when released within the elastic zone', () => {
      expect(resolveSidePanelWidthOnRelease(MIN_SIDE_PANEL_WIDTH - 10)).toEqual({
        type: 'width',
        width: MIN_SIDE_PANEL_WIDTH,
      });
    });

    it('collapses when released past the collapse threshold', () => {
      expect(resolveSidePanelWidthOnRelease(SIDE_PANEL_COLLAPSE_THRESHOLD - 1)).toEqual({
        type: 'collapse',
      });
    });

    it('clamps normally when above the minimum', () => {
      expect(resolveSidePanelWidthOnRelease(300)).toEqual({
        type: 'width',
        width: 300,
      });
    });
  });

  describe('getSidePanelDragIndicatorState', () => {
    const startX = 400;
    const startWidth = 300;

    it('follows the cursor within valid bounds', () => {
      expect(getSidePanelDragIndicatorState(320, startX, startWidth, 420)).toEqual({
        primaryX: 420,
        stretchLeft: 0,
        stretchRight: 0,
      });
    });

    it('pins the primary line at the minimum and stretches left toward the cursor', () => {
      const belowMinBy = 12;
      expect(
        getSidePanelDragIndicatorState(
          MIN_SIDE_PANEL_WIDTH - belowMinBy,
          startX,
          startWidth,
          startX - belowMinBy
        )
      ).toEqual({
        primaryX: startX + (MIN_SIDE_PANEL_WIDTH - startWidth),
        stretchLeft: belowMinBy,
        stretchRight: 0,
      });
    });

    it('caps left stretch at the configured maximum', () => {
      const belowMinBy = SIDE_PANEL_INDICATOR_STRETCH_MAX + 10;
      expect(
        getSidePanelDragIndicatorState(MIN_SIDE_PANEL_WIDTH - belowMinBy, startX, startWidth, 0)
      ).toEqual({
        primaryX: startX + (MIN_SIDE_PANEL_WIDTH - startWidth),
        stretchLeft: SIDE_PANEL_INDICATOR_STRETCH_MAX,
        stretchRight: 0,
      });
    });

    it('pins the primary line at the maximum and stretches right toward the cursor', () => {
      const max = getMaxSidePanelWidth();
      const aboveMaxBy = 8;
      expect(
        getSidePanelDragIndicatorState(max + aboveMaxBy, startX, startWidth, startX + (max - startWidth) + aboveMaxBy)
      ).toEqual({
        primaryX: startX + (max - startWidth),
        stretchLeft: 0,
        stretchRight: aboveMaxBy,
      });
    });
  });
});
