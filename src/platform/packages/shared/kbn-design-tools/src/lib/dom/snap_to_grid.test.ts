/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { snapToGrid } from './snap_to_grid';
import type { LayoutConfig } from '../layout/layout_config';

const makeConfig = (overrides: Partial<LayoutConfig> = {}): LayoutConfig => ({
  layoutType: 'grid',
  count: 12,
  alignType: 'stretch',
  rowAlignType: 'stretch',
  cellSize: 8,
  width: 0,
  height: 0,
  gutterSize: 16,
  marginSize: 16,
  color: '#FF00FF1A',
  ...overrides,
});

describe('snapToGrid', () => {
  describe('grid layout', () => {
    it('snaps both axes to cell size', () => {
      const config = makeConfig({ layoutType: 'grid', cellSize: 8 });
      expect(snapToGrid(11, 13, 0, 0, config, 1024, 768)).toEqual({ dx: 8, dy: 16 });
    });

    it('rounds to nearest increment', () => {
      const config = makeConfig({ layoutType: 'grid', cellSize: 10 });
      expect(snapToGrid(14, 26, 0, 0, config, 1024, 768)).toEqual({ dx: 10, dy: 30 });
    });

    it('snaps negative deltas', () => {
      const config = makeConfig({ layoutType: 'grid', cellSize: 8 });
      expect(snapToGrid(-5, -13, 0, 0, config, 1024, 768)).toEqual({ dx: -8, dy: -16 });
    });

    it('keeps zero unchanged', () => {
      const config = makeConfig({ layoutType: 'grid', cellSize: 8 });
      expect(snapToGrid(0, 0, 0, 0, config, 1024, 768)).toEqual({ dx: 0, dy: 0 });
    });

    it('falls back to 32 when cellSize is 0', () => {
      const config = makeConfig({ layoutType: 'grid', cellSize: 0 });
      expect(snapToGrid(50, 50, 0, 0, config, 1024, 768)).toEqual({ dx: 64, dy: 64 });
    });

    it('snaps absolute position when origin is not on grid', () => {
      const config = makeConfig({ layoutType: 'grid', cellSize: 8 });
      // origin at 53, delta 10 → absolute 63 → snaps to 64 → delta = 64 - 53 = 11
      expect(snapToGrid(10, 10, 53, 53, config, 1024, 768)).toEqual({ dx: 11, dy: 11 });
    });
  });

  describe('columns layout', () => {
    it('snaps X to column left edges accounting for margin offset', () => {
      // stretch: 12 cols, 16px gutter, 16px margin in 1024px viewport
      // availableWidth = 1024 - 32 = 992, totalGutter = 16 * 11 = 176
      // columnWidth = (992 - 176) / 12 = 68, step = 68 + 16 = 84
      // offsetLeft = 16 (margin)
      // snap points: 16, 100, 184, 268, ...
      const config = makeConfig({ layoutType: 'columns', count: 12 });
      // origin=0, dx=50 → abs=50 → nearest snap point: 16 or 100 → 50 is closer to 16? no, (50-16)/84=0.40 rounds to 0 → 16
      const result = snapToGrid(50, 37, 0, 0, config, 1024, 768);
      expect(result.dx).toBe(16);
      expect(result.dy).toBe(37);
    });

    it('snaps to second column when closer', () => {
      // snap points: 16, 100, 184...
      // origin=0, dx=60 → abs=60 → (60-16)/84=0.52 rounds to 1 → 16 + 84 = 100
      const config = makeConfig({ layoutType: 'columns', count: 12 });
      const result = snapToGrid(60, 0, 0, 0, config, 1024, 768);
      expect(result.dx).toBe(100);
    });

    it('does not snap Y axis', () => {
      const config = makeConfig({ layoutType: 'columns' });
      const result = snapToGrid(0, 123.456, 0, 0, config, 1024, 768);
      expect(result.dy).toBe(123.456);
    });
  });

  describe('rows layout', () => {
    it('snaps Y to row top edges accounting for margin offset', () => {
      // stretch: 12 rows, 16px gutter, 16px margin in 768px viewport
      // available = 768 - 32 = 736, totalGutter = 16 * 11 = 176
      // rowHeight = (736 - 176) / 12 ≈ 46.67, step ≈ 62.67
      // offsetTop = 16 (margin)
      // snap points: 16, 78.67, 141.33, ...
      const config = makeConfig({ layoutType: 'rows', count: 12 });
      // origin=0, dx=37, dy=50 → absY=50 → (50-16)/62.67=0.54 rounds to 1 → 16 + 62.67 = 78.67
      const result = snapToGrid(37, 50, 0, 0, config, 1024, 768);
      expect(result.dx).toBe(37);
      expect(result.dy).toBeCloseTo(78.67, 0);
    });

    it('does not snap X axis', () => {
      const config = makeConfig({ layoutType: 'rows' });
      const result = snapToGrid(123.456, 0, 0, 0, config, 1024, 768);
      expect(result.dx).toBe(123.456);
    });
  });
});
