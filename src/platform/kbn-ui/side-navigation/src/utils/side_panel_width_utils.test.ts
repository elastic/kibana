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
  MIN_SIDE_PANEL_WIDTH,
  resolveSidePanelWidthOnRelease,
  SIDE_PANEL_COLLAPSE_THRESHOLD,
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
});
