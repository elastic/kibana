/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findReactComponentPath } from './find_react_component_path';
import { getFiberFromDomNode } from './get_fiber_from_dom_node';
import { getFiberType } from './get_fiber_type';
import type { DebugSource, ReactFiberNode } from './types';
import { COMPONENT_PATH_IGNORED_TYPES } from '../constants';

jest.mock('./get_fiber_from_dom_node');
jest.mock('./get_fiber_type');

const mockGetFiberFromDomNode = getFiberFromDomNode as jest.MockedFunction<
  typeof getFiberFromDomNode
>;
const mockGetFiberType = getFiberType as jest.MockedFunction<typeof getFiberType>;

describe('findReactComponentPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined when no components are found', () => {
    mockGetFiberFromDomNode.mockReturnValue(undefined);

    const element = document.createElement('div');
    const result = findReactComponentPath(element);

    expect(result).toBeUndefined();
    expect(mockGetFiberFromDomNode).toHaveBeenCalledWith(element);
  });

  it('should return single component when only one is found', () => {
    const mockFiber = { _debugOwner: null, _debugSource: undefined } as ReactFiberNode;
    mockGetFiberFromDomNode.mockReturnValue(mockFiber);
    mockGetFiberType.mockReturnValue('TestComponent');

    const element = document.createElement('div');
    const result = findReactComponentPath(element);

    expect(result).toEqual({
      sourceComponent: 'TestComponent',
      path: null,
    });
  });

  it('should construct component path when multiple components are found', () => {
    const debugSource = { fileName: 'test.js' } as DebugSource;
    const mockChildFiber = {
      _debugOwner: null,
      _debugSource: debugSource,
    } as ReactFiberNode;
    const mockParentFiber = {
      _debugOwner: mockChildFiber,
      _debugSource: debugSource,
    } as ReactFiberNode;
    mockGetFiberFromDomNode.mockReturnValue(mockParentFiber);

    mockGetFiberType.mockReturnValueOnce('ParentComponent').mockReturnValueOnce('ChildComponent');

    const element = document.createElement('div');
    const result = findReactComponentPath(element);

    expect(result).toEqual({
      sourceComponent: 'ChildComponent',
      path: 'ChildComponent : ParentComponent',
    });
  });

  it('should ignore components matching ignored types', () => {
    const mockChildFiber = {
      _debugOwner: null,
      _debugSource: undefined,
    } as ReactFiberNode;
    const mockParentFiber = {
      _debugOwner: mockChildFiber,
      _debugSource: undefined,
    } as ReactFiberNode;
    mockGetFiberFromDomNode.mockReturnValue(mockParentFiber);

    mockGetFiberType
      .mockReturnValueOnce(COMPONENT_PATH_IGNORED_TYPES[0] + 'Wrapper')
      .mockReturnValueOnce('RealComponent');

    const element = document.createElement('div');
    const result = findReactComponentPath(element);

    expect(result).toEqual({
      sourceComponent: 'RealComponent',
      path: null,
    });
  });

  it('should handle SVG elements correctly', () => {
    const mockFiber = { _debugOwner: null, _debugSource: undefined } as ReactFiberNode;
    mockGetFiberFromDomNode.mockReturnValue(mockFiber);
    mockGetFiberType.mockReturnValue('SVGComponent');

    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const parentElement = document.createElement('div');
    parentElement.appendChild(svgElement);

    const result = findReactComponentPath(svgElement);

    expect(result).toEqual({
      sourceComponent: 'SVGComponent',
      path: null,
    });
    expect(mockGetFiberFromDomNode).toHaveBeenCalledWith(parentElement);
  });

  it('should trim DOM nodes at the end of the path', () => {
    const mockButtonFiber = {
      _debugOwner: null,
      _debugSource: undefined,
    } as ReactFiberNode;
    const mockChildFiber = {
      _debugOwner: mockButtonFiber,
      _debugSource: undefined,
    } as ReactFiberNode;
    const mockParentFiber = {
      _debugOwner: mockChildFiber,
      _debugSource: undefined,
    } as ReactFiberNode;

    mockGetFiberFromDomNode.mockReturnValue(mockParentFiber);

    mockGetFiberType
      .mockReturnValueOnce('ParentComponent')
      .mockReturnValueOnce('ChildComponent')
      .mockReturnValueOnce('button');

    const element = document.createElement('div');
    const result = findReactComponentPath(element);

    expect(result).toEqual({
      sourceComponent: 'button',
      path: 'button : ChildComponent > ParentComponent',
    });
  });
});
