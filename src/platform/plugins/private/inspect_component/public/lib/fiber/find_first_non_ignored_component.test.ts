/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findFirstNonIgnoredComponent } from './find_first_non_ignored_component';
import { getFiberType } from './get_fiber_type';
import { isIgnoredComponent } from '../utils';
import type { ReactFiberNode, ReactFiberNodeWithDomElement } from './types';

jest.mock('./get_fiber_type');
jest.mock('../utils');

const mockGetFiberType = getFiberType as jest.MockedFunction<typeof getFiberType>;
const mockIsIgnoredComponent = isIgnoredComponent as jest.MockedFunction<typeof isIgnoredComponent>;

describe('findFirstNonIgnoredComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockFiberNode = (
    type: string,
    domElement: HTMLElement,
    debugOwner?: ReactFiberNode | null
  ): ReactFiberNodeWithDomElement => ({
    elementType: type,
    type,
    _debugSource: {
      fileName: 'test.tsx',
      lineNumber: 10,
      columnNumber: 5,
    },
    _debugOwner: debugOwner,
    stateNode: domElement,
    child: undefined,
    sibling: undefined,
    return: undefined,
    domElement,
  });

  it('should return null when no fiber type is found', () => {
    const mockElement = document.createElement('div');
    const fiberNode = createMockFiberNode('TestComponent', mockElement);
    mockGetFiberType.mockReturnValue(null);

    const result = findFirstNonIgnoredComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledWith(fiberNode);
  });

  it('should return null when all components are ignored', () => {
    const mockElement = document.createElement('div');
    const fiberNode = createMockFiberNode('IgnoredComponent', mockElement);
    mockGetFiberType.mockReturnValue('IgnoredComponent');
    mockIsIgnoredComponent.mockReturnValue(true);

    const result = findFirstNonIgnoredComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledWith(fiberNode);
    expect(mockIsIgnoredComponent).toHaveBeenCalledWith('IgnoredComponent');
  });

  it('should return component type when found in current fiber node', () => {
    const mockElement = document.createElement('div');
    const fiberNode = createMockFiberNode('TestComponent', mockElement);
    mockGetFiberType.mockReturnValue('TestComponent');
    mockIsIgnoredComponent.mockReturnValue(false);

    const result = findFirstNonIgnoredComponent(fiberNode);

    expect(result).toBe('TestComponent');
    expect(mockGetFiberType).toHaveBeenCalledWith(fiberNode);
    expect(mockIsIgnoredComponent).toHaveBeenCalledWith('TestComponent');
  });

  it('should traverse debug owner chain to find non-ignored component', () => {
    const mockElement = document.createElement('div');
    const validFiber = createMockFiberNode('ValidComponent', mockElement);
    const ignoredFiber = createMockFiberNode('IgnoredComponent', mockElement, validFiber);
    const rootFiber = createMockFiberNode('AnotherIgnoredComponent', mockElement, ignoredFiber);

    mockGetFiberType
      .mockReturnValueOnce('AnotherIgnoredComponent')
      .mockReturnValueOnce('IgnoredComponent')
      .mockReturnValueOnce('ValidComponent');

    mockIsIgnoredComponent
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const result = findFirstNonIgnoredComponent(rootFiber);

    expect(result).toBe('ValidComponent');
    expect(mockGetFiberType).toHaveBeenCalledTimes(3);
    expect(mockGetFiberType).toHaveBeenNthCalledWith(1, rootFiber);
    expect(mockGetFiberType).toHaveBeenNthCalledWith(2, ignoredFiber);
    expect(mockGetFiberType).toHaveBeenNthCalledWith(3, validFiber);
  });

  it('should return first non-ignored component found in chain', () => {
    const mockElement = document.createElement('div');
    const secondValidFiber = createMockFiberNode('SecondValidComponent', mockElement);
    const firstValidFiber = createMockFiberNode(
      'FirstValidComponent',
      mockElement,
      secondValidFiber
    );
    const ignoredFiber = createMockFiberNode('IgnoredComponent', mockElement, firstValidFiber);

    mockGetFiberType
      .mockReturnValueOnce('IgnoredComponent')
      .mockReturnValueOnce('FirstValidComponent');

    mockIsIgnoredComponent.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const result = findFirstNonIgnoredComponent(ignoredFiber);

    expect(result).toBe('FirstValidComponent');
    expect(mockGetFiberType).toHaveBeenCalledTimes(2);
  });

  it('should handle null debug owner gracefully', () => {
    const mockElement = document.createElement('div');
    const fiberNode = createMockFiberNode('IgnoredComponent', mockElement, null);
    mockGetFiberType.mockReturnValue('IgnoredComponent');
    mockIsIgnoredComponent.mockReturnValue(true);

    const result = findFirstNonIgnoredComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledTimes(1);
  });

  it('should handle undefined debug owner gracefully', () => {
    const mockElement = document.createElement('div');
    const fiberNode = createMockFiberNode('IgnoredComponent', mockElement, undefined);
    mockGetFiberType.mockReturnValue('IgnoredComponent');
    mockIsIgnoredComponent.mockReturnValue(true);

    const result = findFirstNonIgnoredComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledTimes(1);
  });

  it('should handle getFiberType returning null in the middle of traversal', () => {
    const mockElement = document.createElement('div');
    const validFiber = createMockFiberNode('ValidComponent', mockElement);
    const nullTypeFiber = createMockFiberNode('NullTypeComponent', mockElement, validFiber);
    const rootFiber = createMockFiberNode('IgnoredComponent', mockElement, nullTypeFiber);

    mockGetFiberType
      .mockReturnValueOnce('IgnoredComponent')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('ValidComponent');

    mockIsIgnoredComponent.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const result = findFirstNonIgnoredComponent(rootFiber);

    expect(result).toBe('ValidComponent');
    expect(mockGetFiberType).toHaveBeenCalledTimes(3);
  });

  it('should work with different component types (EUI, HTML, custom)', () => {
    const mockElement = document.createElement('div');
    const fiberNode = createMockFiberNode('EuiButton', mockElement);
    mockGetFiberType.mockReturnValue('EuiButton');
    mockIsIgnoredComponent.mockReturnValue(false);

    const result = findFirstNonIgnoredComponent(fiberNode);

    expect(result).toBe('EuiButton');
    expect(mockIsIgnoredComponent).toHaveBeenCalledWith('EuiButton');
  });

  it('should work with HTML tag components', () => {
    const mockElement = document.createElement('div');
    const fiberNode = createMockFiberNode('div', mockElement);
    mockGetFiberType.mockReturnValue('div');
    mockIsIgnoredComponent.mockReturnValue(false);

    const result = findFirstNonIgnoredComponent(fiberNode);

    expect(result).toBe('div');
    expect(mockIsIgnoredComponent).toHaveBeenCalledWith('div');
  });

  it('should traverse through multiple ignored components', () => {
    const mockElement = document.createElement('div');
    const validFiber = createMockFiberNode('ValidComponent', mockElement);
    const ignored3Fiber = createMockFiberNode('Ignored3', mockElement, validFiber);
    const ignored2Fiber = createMockFiberNode('Ignored2', mockElement, ignored3Fiber);
    const ignored1Fiber = createMockFiberNode('Ignored1', mockElement, ignored2Fiber);

    mockGetFiberType
      .mockReturnValueOnce('Ignored1')
      .mockReturnValueOnce('Ignored2')
      .mockReturnValueOnce('Ignored3')
      .mockReturnValueOnce('ValidComponent');

    mockIsIgnoredComponent
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const result = findFirstNonIgnoredComponent(ignored1Fiber);

    expect(result).toBe('ValidComponent');
    expect(mockGetFiberType).toHaveBeenCalledTimes(4);
    expect(mockIsIgnoredComponent).toHaveBeenCalledTimes(4);
  });
});
