/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getElementFromPoint } from './get_element_from_point';
import { INSPECT_OVERLAY_ID } from '../constants';

describe('getElementFromPoint', () => {
  let originalElementsFromPoint: typeof document.elementsFromPoint;
  let mockEvent: MouseEvent;

  beforeEach(() => {
    originalElementsFromPoint = document.elementsFromPoint;
    mockEvent = {
      clientX: 100,
      clientY: 200,
    } as MouseEvent;
  });

  afterEach(() => {
    document.elementsFromPoint = originalElementsFromPoint;
  });

  it('should return the first valid element', () => {
    const mockHtmlElement = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([mockHtmlElement]);

    const result = getElementFromPoint(mockEvent);

    expect(document.elementsFromPoint).toHaveBeenCalledWith(100, 200);
    expect(result).toBe(mockHtmlElement);
  });

  it('should skip overlay', () => {
    const mockOverlayElement = document.createElement('div');
    mockOverlayElement.id = INSPECT_OVERLAY_ID;
    const mockValidElement = document.createElement('div');

    document.elementsFromPoint = jest.fn().mockReturnValue([mockOverlayElement, mockValidElement]);

    const result = getElementFromPoint(mockEvent);

    expect(result).toBe(mockValidElement);
  });

  it('skips SVG path elements', () => {
    const mockSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const mockValidElement = document.createElement('div');

    document.elementsFromPoint = jest.fn().mockReturnValue([mockSvgPath, mockValidElement]);

    const result = getElementFromPoint(mockEvent);

    expect(result).toBe(mockValidElement);
  });

  it('should return parents of SVG elements that are not paths', () => {
    const mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const mockParentElement = document.createElement('div');
    mockParentElement.appendChild(mockSvg);

    document.elementsFromPoint = jest.fn().mockReturnValue([mockSvg]);

    const result = getElementFromPoint(mockEvent);

    expect(result).toBe(mockParentElement);
  });

  it('should return null when no valid elements are found', () => {
    const mockOverlayElement = document.createElement('div');
    mockOverlayElement.id = INSPECT_OVERLAY_ID;
    const mockSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    document.elementsFromPoint = jest.fn().mockReturnValue([mockOverlayElement, mockSvgPath]);

    const result = getElementFromPoint(mockEvent);

    expect(result).toBeNull();
  });

  it('should return null when elements array is empty', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([]);

    const result = getElementFromPoint(mockEvent);

    expect(result).toBeNull();
  });
});
