/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calcResizeDeltas } from './resize_helpers';

describe('calcResizeDeltas', () => {
  const baseWidth = 100;
  const baseHeight = 80;
  const baseDx = 10;
  const baseDy = 20;

  describe('se corner', () => {
    it('should increase width and height', () => {
      const result = calcResizeDeltas('se', 30, 20, baseWidth, baseHeight, baseDx, baseDy);
      expect(result).toEqual({ dx: 10, dy: 20, width: 130, height: 100 });
    });

    it('should clamp to minimum size', () => {
      const result = calcResizeDeltas('se', -200, -200, baseWidth, baseHeight, baseDx, baseDy);
      expect(result.width).toBe(20);
      expect(result.height).toBe(20);
      expect(result.dx).toBe(10);
      expect(result.dy).toBe(20);
    });
  });

  describe('sw corner', () => {
    it('should increase width leftward and height downward', () => {
      const result = calcResizeDeltas('sw', -30, 20, baseWidth, baseHeight, baseDx, baseDy);
      expect(result).toEqual({ dx: -20, dy: 20, width: 130, height: 100 });
    });

    it('should shift dx when shrinking width', () => {
      const result = calcResizeDeltas('sw', 40, 0, baseWidth, baseHeight, baseDx, baseDy);
      expect(result.width).toBe(60);
      expect(result.dx).toBe(50); // baseDx + (100 - 60)
    });
  });

  describe('ne corner', () => {
    it('should increase width rightward and height upward', () => {
      const result = calcResizeDeltas('ne', 30, -20, baseWidth, baseHeight, baseDx, baseDy);
      expect(result).toEqual({ dx: 10, dy: 0, width: 130, height: 100 });
    });

    it('should shift dy when shrinking height', () => {
      const result = calcResizeDeltas('ne', 0, 30, baseWidth, baseHeight, baseDx, baseDy);
      expect(result.height).toBe(50);
      expect(result.dy).toBe(50); // baseDy + (80 - 50)
    });
  });

  describe('nw corner', () => {
    it('should increase width leftward and height upward', () => {
      const result = calcResizeDeltas('nw', -30, -20, baseWidth, baseHeight, baseDx, baseDy);
      expect(result).toEqual({ dx: -20, dy: 0, width: 130, height: 100 });
    });

    it('should shift both dx and dy when shrinking', () => {
      const result = calcResizeDeltas('nw', 40, 30, baseWidth, baseHeight, baseDx, baseDy);
      expect(result.width).toBe(60);
      expect(result.height).toBe(50);
      expect(result.dx).toBe(50); // baseDx + (100 - 60)
      expect(result.dy).toBe(50); // baseDy + (80 - 50)
    });
  });

  it('should respect custom minimum size', () => {
    const result = calcResizeDeltas('se', -200, -200, baseWidth, baseHeight, baseDx, baseDy, 50);
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  describe('n edge', () => {
    it('should only resize height upward', () => {
      const result = calcResizeDeltas('n', 50, -20, baseWidth, baseHeight, baseDx, baseDy);
      expect(result.width).toBe(100); // unchanged
      expect(result.height).toBe(100);
      expect(result.dx).toBe(10); // unchanged
      expect(result.dy).toBe(0); // shifted up
    });
  });

  describe('s edge', () => {
    it('should only resize height downward', () => {
      const result = calcResizeDeltas('s', 50, 20, baseWidth, baseHeight, baseDx, baseDy);
      expect(result.width).toBe(100); // unchanged
      expect(result.height).toBe(100);
      expect(result.dx).toBe(10); // unchanged
      expect(result.dy).toBe(20); // unchanged
    });
  });

  describe('e edge', () => {
    it('should only resize width rightward', () => {
      const result = calcResizeDeltas('e', 30, 50, baseWidth, baseHeight, baseDx, baseDy);
      expect(result.width).toBe(130);
      expect(result.height).toBe(80); // unchanged
      expect(result.dx).toBe(10); // unchanged
      expect(result.dy).toBe(20); // unchanged
    });
  });

  describe('w edge', () => {
    it('should only resize width leftward', () => {
      const result = calcResizeDeltas('w', -30, 50, baseWidth, baseHeight, baseDx, baseDy);
      expect(result.width).toBe(130);
      expect(result.height).toBe(80); // unchanged
      expect(result.dx).toBe(-20); // shifted left
      expect(result.dy).toBe(20); // unchanged
    });
  });
});
