/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findReactComponentPathAndSourceComponent } from './find_react_component_path_and_source_component';
import { getFiberType } from './get_fiber_type';
import type { ReactFiberNode, ReactFiberNodeWithDomElement } from './types';

jest.mock('./get_fiber_type');

const mockGetFiberType = getFiberType as jest.MockedFunction<typeof getFiberType>;

describe('findReactComponentPathAndSourceComponent', () => {
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

  it('should return null when no components are found', () => {
    const fiberNode = createMockFiberNode('div', mockElement);
    mockGetFiberType.mockReturnValue(null);

    const result = findReactComponentPathAndSourceComponent(fiberNode);

    expect(result).toBeNull();
  });

  it('should return null when path is empty', () => {
    const fiberNode = createMockFiberNode('div', mockElement);
    mockGetFiberType.mockReturnValue('div');

    const result = findReactComponentPathAndSourceComponent(fiberNode);

    expect(result).toBeNull();
  });

  it('should find source component when only one user-defined component exists', () => {
    const fiberNode = createMockFiberNode('TestComponent', mockElement);
    mockGetFiberType.mockReturnValue('TestComponent');

    const result = findReactComponentPathAndSourceComponent(fiberNode);

    expect(result).toEqual({
      path: 'TestComponent',
      sourceComponent: {
        type: 'TestComponent',
        domElement: mockElement,
      },
    });
  });

  it('should construct component path with multiple components', () => {
    const parentFiber = createMockFiberNode('ParentComponent', mockParentElement);
    const childFiber = createMockFiberNode('EuiButton', mockElement, parentFiber);

    mockGetFiberType.mockReturnValueOnce('EuiButton').mockReturnValueOnce('ParentComponent');

    const result = findReactComponentPathAndSourceComponent(childFiber);

    expect(result).toEqual({
      path: 'ParentComponent : EuiButton',
      sourceComponent: {
        type: 'ParentComponent',
        domElement: mockElement,
      },
    });
  });

  it('should ignore EUI components in path when not main components', () => {
    const userFiber = createMockFiberNode('UserComponent', mockElement);
    const euiFiber = createMockFiberNode('EuiFlexItem', mockElement, userFiber);

    mockGetFiberType.mockReturnValueOnce('EuiFlexItem').mockReturnValueOnce('UserComponent');

    const result = findReactComponentPathAndSourceComponent(euiFiber);

    expect(result).toEqual({
      path: 'UserComponent : EuiFlexItem',
      sourceComponent: {
        type: 'UserComponent',
        domElement: mockElement,
      },
    });
  });

  it('should include EUI main components in path', () => {
    const userFiber = createMockFiberNode('UserComponent', mockElement);
    const euiButtonFiber = createMockFiberNode('EuiButton', mockElement, userFiber);

    mockGetFiberType.mockReturnValueOnce('EuiButton').mockReturnValueOnce('UserComponent');

    const result = findReactComponentPathAndSourceComponent(euiButtonFiber);

    expect(result).toEqual({
      path: 'UserComponent : EuiButton',
      sourceComponent: {
        type: 'UserComponent',
        domElement: mockElement,
      },
    });
  });

  it('should filter HTML tags to first and last positions only', () => {
    const userFiber = createMockFiberNode('UserComponent', mockElement);
    const divFiber = createMockFiberNode('div', mockElement, userFiber);
    const buttonFiber = createMockFiberNode('button', mockElement, divFiber);

    mockGetFiberType
      .mockReturnValueOnce('button')
      .mockReturnValueOnce('div')
      .mockReturnValueOnce('UserComponent');

    const result = findReactComponentPathAndSourceComponent(buttonFiber);

    expect(result).toEqual({
      path: 'UserComponent : div > button',
      sourceComponent: {
        type: 'UserComponent',
        domElement: mockElement,
      },
    });
  });
});
