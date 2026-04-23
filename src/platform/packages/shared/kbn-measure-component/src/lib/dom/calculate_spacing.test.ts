/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateSpacingLines } from './calculate_spacing';

const makeRect = (x: number, y: number, w: number, h: number): DOMRect =>
  ({
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    width: w,
    height: h,
    x,
    y,
    toJSON: () => {},
  } as DOMRect);

describe('calculateSpacingLines', () => {
  describe('side-by-side (horizontal gap)', () => {
    it('returns a horizontal line between two horizontally separated elements', () => {
      const anchor = makeRect(0, 0, 100, 50);
      const target = makeRect(150, 10, 100, 50);

      const lines = calculateSpacingLines(anchor, target);

      expect(lines).toHaveLength(1);
      expect(lines[0].orientation).toBe('horizontal');
      expect(lines[0].distance).toBe(50);
      expect(lines[0].x1).toBe(100);
      expect(lines[0].x2).toBe(150);
    });

    it('works regardless of element order', () => {
      const anchor = makeRect(200, 0, 100, 50);
      const target = makeRect(0, 10, 100, 50);

      const lines = calculateSpacingLines(anchor, target);

      expect(lines).toHaveLength(1);
      expect(lines[0].orientation).toBe('horizontal');
      expect(lines[0].distance).toBe(100);
    });
  });

  describe('stacked (vertical gap)', () => {
    it('returns a vertical line between two vertically separated elements', () => {
      const anchor = makeRect(10, 0, 100, 50);
      const target = makeRect(20, 80, 100, 50);

      const lines = calculateSpacingLines(anchor, target);

      expect(lines).toHaveLength(1);
      expect(lines[0].orientation).toBe('vertical');
      expect(lines[0].distance).toBe(30);
      expect(lines[0].y1).toBe(50);
      expect(lines[0].y2).toBe(80);
    });

    it('works regardless of element order', () => {
      const anchor = makeRect(10, 200, 100, 50);
      const target = makeRect(20, 0, 100, 50);

      const lines = calculateSpacingLines(anchor, target);

      expect(lines).toHaveLength(1);
      expect(lines[0].orientation).toBe('vertical');
      expect(lines[0].distance).toBe(150);
    });
  });

  describe('containment', () => {
    it('returns up to 4 lines when one element contains the other', () => {
      const outer = makeRect(0, 0, 200, 200);
      const inner = makeRect(30, 40, 100, 80);

      const lines = calculateSpacingLines(outer, inner);

      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines.length).toBeLessThanOrEqual(4);

      const horizontal = lines.filter((l) => l.orientation === 'horizontal');
      const vertical = lines.filter((l) => l.orientation === 'vertical');

      expect(horizontal).toHaveLength(2);
      expect(vertical).toHaveLength(2);

      // Left distance: 30
      expect(horizontal.find((l) => l.distance === 30)).toBeTruthy();
      // Right distance: 200 - 130 = 70
      expect(horizontal.find((l) => l.distance === 70)).toBeTruthy();
      // Top distance: 40
      expect(vertical.find((l) => l.distance === 40)).toBeTruthy();
      // Bottom distance: 200 - 120 = 80
      expect(vertical.find((l) => l.distance === 80)).toBeTruthy();
    });

    it('works when inner element is the anchor', () => {
      const inner = makeRect(30, 40, 100, 80);
      const outer = makeRect(0, 0, 200, 200);

      const lines = calculateSpacingLines(inner, outer);

      expect(lines).toHaveLength(4);
    });
  });

  describe('diagonal (no overlap)', () => {
    it('returns empty array for diagonally separated elements', () => {
      const anchor = makeRect(0, 0, 50, 50);
      const target = makeRect(100, 100, 50, 50);

      const lines = calculateSpacingLines(anchor, target);

      expect(lines).toHaveLength(0);
    });
  });

  describe('partial overlap', () => {
    it('returns empty array for partially overlapping elements', () => {
      const anchor = makeRect(0, 0, 100, 100);
      const target = makeRect(50, 50, 100, 100);

      const lines = calculateSpacingLines(anchor, target);

      expect(lines).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('returns empty for touching elements with no gap', () => {
      const anchor = makeRect(0, 0, 100, 50);
      const target = makeRect(100, 10, 100, 50);

      const lines = calculateSpacingLines(anchor, target);

      expect(lines).toHaveLength(0);
    });

    it('handles containment with flush edges (zero distance)', () => {
      const outer = makeRect(0, 0, 200, 200);
      const inner = makeRect(0, 0, 100, 100);

      const lines = calculateSpacingLines(outer, inner);

      // Only right and bottom have distance > 0
      expect(lines).toHaveLength(2);
      expect(lines.every((l) => l.distance > 0)).toBe(true);
    });
  });
});
