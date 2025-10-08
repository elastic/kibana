/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findSourceComponent } from './find_source_component';
import { getFiberType } from './get_fiber_type';
import type { ReactFiberNode } from './types';

jest.mock('./get_fiber_type');

const mockGetFiberType = getFiberType as jest.MockedFunction<typeof getFiberType>;

describe('findSourceComponent', () => {
  let mockElement: HTMLElement;
  let mockParentElement: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    mockElement = document.createElement('div');
    mockParentElement = document.createElement('div');
    mockParentElement.appendChild(mockElement);
  });

  const createMockFiberNode = (
    type: string,
    element: HTMLElement,
    debugOwner?: ReactFiberNode | null
  ): ReactFiberNode => ({
    elementType: type,
    type,
    _debugSource: {
      fileName: 'test.tsx',
      lineNumber: 10,
      columnNumber: 5,
    },
    _debugOwner: debugOwner,
    stateNode: element,
    child: undefined,
    sibling: undefined,
    return: undefined,
    element,
  });

  it('should return null when no components are found', () => {
    const fiberNode = createMockFiberNode('div', mockElement);
    mockGetFiberType.mockReturnValue(null);

    const result = findSourceComponent(fiberNode);

    expect(result).toBeNull();
  });

  it('should return null when only HTML tags are found', () => {
    const fiberNode = createMockFiberNode('div', mockElement);
    mockGetFiberType.mockReturnValue('div');

    const result = findSourceComponent(fiberNode);

    expect(result).toBeNull();
  });

  it('should find source component when only one user-defined component exists', () => {
    const fiberNode = createMockFiberNode('TestComponent', mockElement);
    mockGetFiberType.mockReturnValue('TestComponent');

    const result = findSourceComponent(fiberNode);

    expect(result).toEqual({
      type: 'TestComponent',
      element: mockElement,
    });
  });

  it('should find first user-defined component with multiple components', () => {
    const parentFiber = createMockFiberNode('ParentComponent', mockParentElement);
    const childFiber = createMockFiberNode('EuiButton', mockElement, parentFiber);

    mockGetFiberType.mockReturnValueOnce('EuiButton').mockReturnValueOnce('ParentComponent');

    const result = findSourceComponent(childFiber);

    expect(result).toEqual({
      type: 'ParentComponent',
      element: mockElement,
    });
  });

  it('should find first user-defined component ignoring EUI components', () => {
    const userFiber = createMockFiberNode('UserComponent', mockElement);
    const euiFiber = createMockFiberNode('EuiFlexItem', mockElement, userFiber);

    mockGetFiberType.mockReturnValueOnce('EuiFlexItem').mockReturnValueOnce('UserComponent');

    const result = findSourceComponent(euiFiber);

    expect(result).toEqual({
      type: 'UserComponent',
      element: mockElement,
    });
  });

  it('should find first user-defined component with EUI button', () => {
    const userFiber = createMockFiberNode('UserComponent', mockElement);
    const euiButtonFiber = createMockFiberNode('EuiButton', mockElement, userFiber);

    mockGetFiberType.mockReturnValueOnce('EuiButton').mockReturnValueOnce('UserComponent');

    const result = findSourceComponent(euiButtonFiber);

    expect(result).toEqual({
      type: 'UserComponent',
      element: mockElement,
    });
  });

  it('should find first user-defined component ignoring HTML tags', () => {
    const userFiber = createMockFiberNode('UserComponent', mockElement);
    const divFiber = createMockFiberNode('div', mockElement, userFiber);
    const buttonFiber = createMockFiberNode('button', mockElement, divFiber);

    mockGetFiberType
      .mockReturnValueOnce('button')
      .mockReturnValueOnce('div')
      .mockReturnValueOnce('UserComponent');

    const result = findSourceComponent(buttonFiber);

    expect(result).toEqual({
      type: 'UserComponent',
      element: mockElement,
    });
  });
});
