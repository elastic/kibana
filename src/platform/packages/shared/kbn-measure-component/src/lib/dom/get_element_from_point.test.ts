/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getElementFromPoint } from './get_element_from_point';
import { MEASURE_OVERLAY_ID } from '../constants';

describe('getElementFromPoint', () => {
  let originalElementsFromPoint: typeof document.elementsFromPoint;
  let mockEvent: MouseEvent;

  beforeEach(() => {
    originalElementsFromPoint = document.elementsFromPoint;
    mockEvent = { clientX: 100, clientY: 200 } as MouseEvent;
  });

  afterEach(() => {
    document.elementsFromPoint = originalElementsFromPoint;
  });

  it('should return the first HTML element', () => {
    const el = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([el]);

    expect(getElementFromPoint(mockEvent)).toBe(el);
    expect(document.elementsFromPoint).toHaveBeenCalledWith(100, 200);
  });

  it('should skip the measure overlay', () => {
    const overlay = document.createElement('div');
    overlay.id = MEASURE_OVERLAY_ID;
    const target = document.createElement('div');

    document.elementsFromPoint = jest.fn().mockReturnValue([overlay, target]);

    expect(getElementFromPoint(mockEvent)).toBe(target);
  });

  it('should return closest svg element for SVG children', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    svg.appendChild(rect);
    const parent = document.createElement('div');
    parent.appendChild(svg);

    document.elementsFromPoint = jest.fn().mockReturnValue([rect]);

    // closest('svg') returns the parent svg element, cast as HTMLElement
    expect(getElementFromPoint(mockEvent)).toBeTruthy();
  });

  it('should return null when no valid elements exist', () => {
    const overlay = document.createElement('div');
    overlay.id = MEASURE_OVERLAY_ID;

    document.elementsFromPoint = jest.fn().mockReturnValue([overlay]);

    expect(getElementFromPoint(mockEvent)).toBeNull();
  });

  it('should return null for empty elements array', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([]);

    expect(getElementFromPoint(mockEvent)).toBeNull();
  });
});
