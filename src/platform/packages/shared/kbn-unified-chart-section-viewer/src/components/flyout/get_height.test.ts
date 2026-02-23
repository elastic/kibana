/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateFlyoutContentHeight } from './get_height';

describe('calculateFlyoutContentHeight', () => {
  const originalInnerHeight = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  const createMockElement = (top: number): HTMLElement => {
    return {
      getBoundingClientRect: jest.fn(() => ({
        top,
        bottom: top + 100,
        left: 0,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: top,
        toJSON: jest.fn(),
      })),
    } as unknown as HTMLElement;
  };

  it('returns 0 when containerRef is null', () => {
    const result = calculateFlyoutContentHeight(null);
    expect(result).toBe(0);
  });

  it('returns 0 when containerRef is undefined', () => {
    const result = calculateFlyoutContentHeight(undefined as unknown as HTMLElement | null);
    expect(result).toBe(0);
  });

  it('calculates height correctly with default marginBottom', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    const mockElement = createMockElement(200);
    const result = calculateFlyoutContentHeight(mockElement);

    // window.innerHeight (1000) - position.top (200) - DEFAULT_MARGIN_BOTTOM (16) = 784
    expect(result).toBe(784);
  });

  it('calculates height correctly with custom marginBottom', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    const mockElement = createMockElement(200);
    const customMargin = 50;
    const result = calculateFlyoutContentHeight(mockElement, customMargin);

    // window.innerHeight (1000) - position.top (200) - customMargin (50) = 750
    expect(result).toBe(750);
  });

  it('handles element at top of viewport', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    const mockElement = createMockElement(0);
    const result = calculateFlyoutContentHeight(mockElement);

    // window.innerHeight (800) - position.top (0) - DEFAULT_MARGIN_BOTTOM (16) = 784
    expect(result).toBe(784);
  });

  it('handles element positioned below viewport', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    const mockElement = createMockElement(500);
    const result = calculateFlyoutContentHeight(mockElement);

    // window.innerHeight (800) - position.top (500) - DEFAULT_MARGIN_BOTTOM (16) = 284
    expect(result).toBe(284);
  });

  it('handles zero marginBottom', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    const mockElement = createMockElement(200);
    const result = calculateFlyoutContentHeight(mockElement, 0);

    // window.innerHeight (1000) - position.top (200) - 0 = 800
    expect(result).toBe(800);
  });

  it('handles large marginBottom', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    const mockElement = createMockElement(200);
    const result = calculateFlyoutContentHeight(mockElement, 200);

    // window.innerHeight (1000) - position.top (200) - marginBottom (200) = 600
    expect(result).toBe(600);
  });

  it('handles different window heights', () => {
    const testCases = [
      { windowHeight: 500, elementTop: 100, expected: 384 }, // 500 - 100 - 16
      { windowHeight: 1200, elementTop: 300, expected: 884 }, // 1200 - 300 - 16
      { windowHeight: 800, elementTop: 400, expected: 384 }, // 800 - 400 - 16
    ];

    testCases.forEach(({ windowHeight, elementTop, expected }) => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: windowHeight,
      });

      const mockElement = createMockElement(elementTop);
      const result = calculateFlyoutContentHeight(mockElement);

      expect(result).toBe(expected);
    });
  });

  it('calls getBoundingClientRect on the container element', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    const mockElement = createMockElement(200);
    const getBoundingClientRectSpy = jest.spyOn(mockElement, 'getBoundingClientRect');

    calculateFlyoutContentHeight(mockElement);

    expect(getBoundingClientRectSpy).toHaveBeenCalledTimes(1);
  });
});
