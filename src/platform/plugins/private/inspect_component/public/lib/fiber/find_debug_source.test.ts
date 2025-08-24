/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findDebugSource } from './find_debug_source';
import { getFiberFromDomNode } from './get_fiber_from_dom_node';
import type { DebugSource, ReactFiberNode } from './types';

jest.mock('./get_fiber_from_dom_node');

describe('findDebugSource', () => {
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

    (getFiberFromDomNode as jest.Mock).mockReset();
  });

  it('should return undefined when no fiber is found', () => {
    (getFiberFromDomNode as jest.Mock).mockReturnValue(undefined);

    const result = findDebugSource(mockElement);

    expect(result).toBeUndefined();
    expect(getFiberFromDomNode).toHaveBeenCalledWith(mockElement);
  });

  it('should return debug source from the direct fiber', () => {
    mockFiber._debugSource = mockDebugSource;
    (getFiberFromDomNode as jest.Mock).mockReturnValue(mockFiber);

    const result = findDebugSource(mockElement);

    expect(result).toBe(mockDebugSource);
  });

  it('should traverse up the fiber owner chain to find debug source', () => {
    const ownerFiber: ReactFiberNode = {
      _debugSource: mockDebugSource,
      _debugOwner: undefined,
    } as ReactFiberNode;

    mockFiber._debugOwner = ownerFiber;
    (getFiberFromDomNode as jest.Mock).mockReturnValue(mockFiber);

    const result = findDebugSource(mockElement);

    expect(result).toBe(mockDebugSource);
  });

  it('should traverse up the DOM tree if no fiber or debug source is found', () => {
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

    (getFiberFromDomNode as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(grandParentFiber);

    const result = findDebugSource(mockElement);

    expect(result).toBe(mockDebugSource);
    expect(getFiberFromDomNode).toHaveBeenNthCalledWith(1, mockElement);
    expect(getFiberFromDomNode).toHaveBeenNthCalledWith(2, parentElement);
    expect(getFiberFromDomNode).toHaveBeenNthCalledWith(3, grandParentElement);
  });

  it('should return undefined when traversing the DOM tree finds no debug source', () => {
    const parentElement = document.createElement('div');
    Object.defineProperty(mockElement, 'parentElement', {
      value: parentElement,
      writable: true,
    });
    Object.defineProperty(parentElement, 'parentElement', {
      value: null,
      writable: true,
    });

    (getFiberFromDomNode as jest.Mock)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const result = findDebugSource(mockElement);

    expect(result).toBeUndefined();
  });
});
