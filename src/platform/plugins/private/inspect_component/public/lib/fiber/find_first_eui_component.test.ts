/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findFirstEuiComponent } from './find_first_eui_component';
import { getFiberType } from './get_fiber_type';
import { isEuiMainComponent, isExcludedComponent } from '../utils';
import type { ReactFiberNode } from './types';

jest.mock('./get_fiber_type');
jest.mock('../utils');

const mockGetFiberType = getFiberType as jest.MockedFunction<typeof getFiberType>;
const mockIsEuiMainComponent = isEuiMainComponent as jest.MockedFunction<typeof isEuiMainComponent>;
const mockIsExcludedComponent = isExcludedComponent as jest.MockedFunction<
  typeof isExcludedComponent
>;

describe('findFirstEuiComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockFiberNode = (
    type: string,
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
    stateNode: null,
    child: undefined,
    sibling: undefined,
    return: undefined,
  });

  it('should return null when no Fiber type is found', () => {
    const fiberNode = createMockFiberNode('TestComponent');
    mockGetFiberType.mockReturnValue(null);

    const result = findFirstEuiComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledWith(fiberNode);
  });

  it('should return null when no EUI component is found', () => {
    const fiberNode = createMockFiberNode('TestComponent');
    mockGetFiberType.mockReturnValue('TestComponent');
    mockIsEuiMainComponent.mockReturnValue(false);
    mockIsExcludedComponent.mockReturnValue(false);

    const result = findFirstEuiComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledWith(fiberNode);
    expect(mockIsEuiMainComponent).toHaveBeenCalledWith('TestComponent');
  });

  it('should return null when EUI component is skipped', () => {
    const fiberNode = createMockFiberNode('EuiButton');
    mockGetFiberType.mockReturnValue('EuiButton');
    mockIsEuiMainComponent.mockReturnValue(true);
    mockIsExcludedComponent.mockReturnValue(true);

    const result = findFirstEuiComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledWith(fiberNode);
    expect(mockIsEuiMainComponent).toHaveBeenCalledWith('EuiButton');
    expect(mockIsExcludedComponent).toHaveBeenCalledWith('EuiButton');
  });

  it('should return EUI component when found in current React Fiber node', () => {
    const fiberNode = createMockFiberNode('EuiButton');
    mockGetFiberType.mockReturnValue('EuiButton');
    mockIsEuiMainComponent.mockReturnValue(true);
    mockIsExcludedComponent.mockReturnValue(false);

    const result = findFirstEuiComponent(fiberNode);

    expect(result).toBe('EuiButton');
    expect(mockGetFiberType).toHaveBeenCalledWith(fiberNode);
    expect(mockIsEuiMainComponent).toHaveBeenCalledWith('EuiButton');
    expect(mockIsExcludedComponent).toHaveBeenCalledWith('EuiButton');
  });

  it('should traverse debug owner chain to find EUI component', () => {
    const euiButtonFiber = createMockFiberNode('EuiButton');
    const nonEuiFiber = createMockFiberNode('TestComponent', euiButtonFiber);
    const rootFiber = createMockFiberNode('div', nonEuiFiber);

    mockGetFiberType
      .mockReturnValueOnce('div')
      .mockReturnValueOnce('TestComponent')
      .mockReturnValueOnce('EuiButton');

    mockIsEuiMainComponent
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    mockIsExcludedComponent.mockReturnValue(false);

    const result = findFirstEuiComponent(rootFiber);

    expect(result).toBe('EuiButton');
    expect(mockGetFiberType).toHaveBeenCalledTimes(3);
    expect(mockGetFiberType).toHaveBeenNthCalledWith(1, rootFiber);
    expect(mockGetFiberType).toHaveBeenNthCalledWith(2, nonEuiFiber);
    expect(mockGetFiberType).toHaveBeenNthCalledWith(3, euiButtonFiber);
  });

  it('should return first EUI component found in chain', () => {
    const euiTableFiber = createMockFiberNode('EuiTable');
    const euiButtonFiber = createMockFiberNode('EuiButton', euiTableFiber);
    const rootFiber = createMockFiberNode('TestComponent', euiButtonFiber);

    mockGetFiberType.mockReturnValueOnce('TestComponent').mockReturnValueOnce('EuiButton');

    mockIsEuiMainComponent.mockReturnValueOnce(false).mockReturnValueOnce(true);

    mockIsExcludedComponent.mockReturnValue(false);

    const result = findFirstEuiComponent(rootFiber);

    expect(result).toBe('EuiButton');
    expect(mockGetFiberType).toHaveBeenCalledTimes(2);
  });

  it('should handle null debug owner gracefully', () => {
    const fiberNode = createMockFiberNode('TestComponent', null);
    mockGetFiberType.mockReturnValue('TestComponent');
    mockIsEuiMainComponent.mockReturnValue(false);
    mockIsExcludedComponent.mockReturnValue(false);

    const result = findFirstEuiComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledTimes(1);
  });

  it('should handle undefined debug owner gracefully', () => {
    const fiberNode = createMockFiberNode('TestComponent', undefined);
    mockGetFiberType.mockReturnValue('TestComponent');
    mockIsEuiMainComponent.mockReturnValue(false);
    mockIsExcludedComponent.mockReturnValue(false);

    const result = findFirstEuiComponent(fiberNode);

    expect(result).toBeNull();
    expect(mockGetFiberType).toHaveBeenCalledTimes(1);
  });

  it('should find EUI component when mixed with non-EUI components', () => {
    const euiFlexFiber = createMockFiberNode('EuiFlex');
    const divFiber = createMockFiberNode('div', euiFlexFiber);
    const userComponentFiber = createMockFiberNode('UserComponent', divFiber);

    mockGetFiberType
      .mockReturnValueOnce('UserComponent')
      .mockReturnValueOnce('div')
      .mockReturnValueOnce('EuiFlex');

    mockIsEuiMainComponent
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    mockIsExcludedComponent.mockReturnValue(false);

    const result = findFirstEuiComponent(userComponentFiber);

    expect(result).toBe('EuiFlex');
    expect(mockGetFiberType).toHaveBeenCalledTimes(3);
  });
});
