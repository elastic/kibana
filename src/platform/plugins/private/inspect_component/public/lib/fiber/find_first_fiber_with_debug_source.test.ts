/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findFirstFiberWithDebugSource } from './find_first_fiber_with_debug_source';
import { getFiberFromHtmlElement } from './get_fiber_from_html_element';
import type { DebugSource, ReactFiberNode } from './types';

jest.mock('./get_fiber_from_html_element');

describe('findFirstFiberWithDebugSource', () => {
  let mockElement: HTMLElement;
  let mockFiber: ReactFiberNode;
  let mockDebugSource: DebugSource;

  beforeEach(() => {
    mockElement = document.createElement('div');
    mockDebugSource = { fileName: 'test.tsx', lineNumber: 10, columnNumber: 5 };
    mockFiber = {
      _debugSource: undefined,
      _debugOwner: undefined,
    } as ReactFiberNode;

    (getFiberFromHtmlElement as jest.Mock).mockReset();
  });

  it('should return null when no Fiber is found', () => {
    (getFiberFromHtmlElement as jest.Mock).mockReturnValue(undefined);

    const result = findFirstFiberWithDebugSource(mockElement);

    expect(result).toBeNull();
    expect(getFiberFromHtmlElement).toHaveBeenCalledWith(mockElement);
  });

  it('should return Fiber with debug source and HTML element from the direct Fiber', () => {
    mockFiber._debugSource = mockDebugSource;
    (getFiberFromHtmlElement as jest.Mock).mockReturnValue(mockFiber);

    const result = findFirstFiberWithDebugSource(mockElement);

    expect(result).toEqual({
      ...mockFiber,
      element: mockElement,
    });
  });

  it('should traverse up the Fiber owner chain to find debug source', () => {
    const ownerFiber: ReactFiberNode = {
      _debugSource: mockDebugSource,
      _debugOwner: undefined,
    } as ReactFiberNode;

    mockFiber._debugOwner = ownerFiber;
    (getFiberFromHtmlElement as jest.Mock).mockReturnValue(mockFiber);

    const result = findFirstFiberWithDebugSource(mockElement);

    expect(result).toEqual({
      ...ownerFiber,
      element: mockElement,
    });
  });

  it('should traverse up the DOM tree if no Fiber or debug source is found', () => {
    const parentElement = document.createElement('div');
    const grandParentElement = document.createElement('div');

    Object.defineProperty(mockElement, 'parentElement', {
      value: parentElement,
      writable: true,
    });

    Object.defineProperty(parentElement, 'parentElement', {
      value: grandParentElement,
      writable: true,
    });

    const grandParentFiber: ReactFiberNode = {
      _debugSource: mockDebugSource,
      _debugOwner: undefined,
    } as ReactFiberNode;

    (getFiberFromHtmlElement as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(grandParentFiber);

    const result = findFirstFiberWithDebugSource(mockElement);

    expect(result).toEqual({
      ...grandParentFiber,
      element: grandParentElement,
    });
    expect(getFiberFromHtmlElement).toHaveBeenNthCalledWith(1, mockElement);
    expect(getFiberFromHtmlElement).toHaveBeenNthCalledWith(2, parentElement);
    expect(getFiberFromHtmlElement).toHaveBeenNthCalledWith(3, grandParentElement);
  });

  it('should return null when traversing the DOM tree finds no debug source', () => {
    const parentElement = document.createElement('div');
    Object.defineProperty(mockElement, 'parentElement', {
      value: parentElement,
      writable: true,
    });
    Object.defineProperty(parentElement, 'parentElement', {
      value: null,
      writable: true,
    });

    (getFiberFromHtmlElement as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const result = findFirstFiberWithDebugSource(mockElement);

    expect(result).toBeNull();
  });
});
