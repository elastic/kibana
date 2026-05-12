/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasSignificantRounding, isInRoundedDeadZone } from './rounded_dead_zone';
import { EDGE_ZONE } from '../constants';

describe('hasSignificantRounding', () => {
  const mockRounding = (radii: {
    topLeft?: string;
    topRight?: string;
    bottomRight?: string;
    bottomLeft?: string;
  }): HTMLElement => {
    const el = document.createElement('div');
    const original = window.getComputedStyle;
    jest.spyOn(window, 'getComputedStyle').mockImplementation((target) => {
      if (target === el) {
        return {
          borderTopLeftRadius: radii.topLeft ?? '0px',
          borderTopRightRadius: radii.topRight ?? '0px',
          borderBottomRightRadius: radii.bottomRight ?? '0px',
          borderBottomLeftRadius: radii.bottomLeft ?? '0px',
        } as CSSStyleDeclaration;
      }
      return original(target);
    });
    return el;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false for an element with no border-radius', () => {
    const el = mockRounding({});
    expect(hasSignificantRounding(el)).toBe(false);
  });

  it('returns false for border-radius at or below the threshold', () => {
    const el = mockRounding({
      topLeft: '4px',
      topRight: '4px',
      bottomRight: '4px',
      bottomLeft: '4px',
    });
    expect(hasSignificantRounding(el)).toBe(false);
  });

  it('returns true for border-radius above the threshold', () => {
    const el = mockRounding({
      topLeft: '8px',
      topRight: '8px',
      bottomRight: '8px',
      bottomLeft: '8px',
    });
    expect(hasSignificantRounding(el)).toBe(true);
  });

  it('returns true for border-radius: 50%', () => {
    const el = mockRounding({
      topLeft: '50%',
      topRight: '50%',
      bottomRight: '50%',
      bottomLeft: '50%',
    });
    expect(hasSignificantRounding(el)).toBe(true);
  });

  it('returns true when only one corner exceeds the threshold', () => {
    const el = mockRounding({ topLeft: '12px' });
    expect(hasSignificantRounding(el)).toBe(true);
  });

  it('returns false when all corners are below the threshold', () => {
    const el = mockRounding({
      topLeft: '2px',
      topRight: '3px',
      bottomRight: '4px',
      bottomLeft: '1px',
    });
    expect(hasSignificantRounding(el)).toBe(false);
  });
});

describe('isInRoundedDeadZone', () => {
  const rect = { left: 100, top: 200, right: 300, bottom: 400, width: 200, height: 200 } as DOMRect;

  it('returns false when the pointer is outside the bounding rect', () => {
    expect(isInRoundedDeadZone(50, 250, rect)).toBe(false);
    expect(isInRoundedDeadZone(350, 250, rect)).toBe(false);
    expect(isInRoundedDeadZone(200, 150, rect)).toBe(false);
    expect(isInRoundedDeadZone(200, 450, rect)).toBe(false);
  });

  it('returns false when the pointer is in the center of the rect', () => {
    expect(isInRoundedDeadZone(200, 300, rect)).toBe(false);
  });

  it('returns true near the left edge', () => {
    expect(isInRoundedDeadZone(100 + EDGE_ZONE - 1, 300, rect)).toBe(true);
  });

  it('returns true near the right edge', () => {
    expect(isInRoundedDeadZone(300 - EDGE_ZONE + 1, 300, rect)).toBe(true);
  });

  it('returns true near the top edge', () => {
    expect(isInRoundedDeadZone(200, 200 + EDGE_ZONE - 1, rect)).toBe(true);
  });

  it('returns true near the bottom edge', () => {
    expect(isInRoundedDeadZone(200, 400 - EDGE_ZONE + 1, rect)).toBe(true);
  });

  it('returns true at the exact corner of the bounding rect', () => {
    expect(isInRoundedDeadZone(100, 200, rect)).toBe(true);
    expect(isInRoundedDeadZone(300, 200, rect)).toBe(true);
    expect(isInRoundedDeadZone(100, 400, rect)).toBe(true);
    expect(isInRoundedDeadZone(300, 400, rect)).toBe(true);
  });

  it('returns false just past the edge zone threshold', () => {
    expect(isInRoundedDeadZone(100 + EDGE_ZONE + 1, 200 + EDGE_ZONE + 1, rect)).toBe(false);
  });
});
