/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberFromDomNode } from './get_fiber_from_dom_node';
import type { ReactFiberNode } from './types';

describe('getFiberFromDomNode', () => {
  it('should return undefined when node is null', () => {
    expect(getFiberFromDomNode(null)).toBeUndefined();
  });

  it('should return undefined when node does not have a fiber key', () => {
    const mockNode = document.createElement('div');

    const result = getFiberFromDomNode(mockNode);

    expect(result).toBeUndefined();
  });

  it('should return the fiber node when fiber key exists', () => {
    const mockFiberNode = { tag: 5, type: 'div' } as unknown as ReactFiberNode;
    const mockNode = document.createElement('div');

    const fiberKey = '__reactFiber$abcdef';
    Object.defineProperty(mockNode, fiberKey, {
      value: mockFiberNode,
      enumerable: true,
    });

    const result = getFiberFromDomNode(mockNode);

    expect(result).toBe(mockFiberNode);
  });

  it('should find the correct fiber key when multiple keys exist', () => {
    const mockFiberNode = { tag: 5, type: 'div' } as unknown as ReactFiberNode;
    const mockNode = document.createElement('div');

    Object.defineProperty(mockNode, 'regularProperty', {
      value: 'test',
      enumerable: true,
    });

    const fiberKey = '__reactFiber$abcdef';

    Object.defineProperty(mockNode, fiberKey, {
      value: mockFiberNode,
      enumerable: true,
    });

    const result = getFiberFromDomNode(mockNode);

    expect(result).toBe(mockFiberNode);
  });

  it('should work with SVG elements', () => {
    const mockFiberNode = { tag: 5, type: 'circle' } as unknown as ReactFiberNode;
    const mockNode = document.createElementNS('http://www.w3.org/2000/svg', 'circle');

    const fiberKey = '__reactFiber$abcdef';

    Object.defineProperty(mockNode, fiberKey, {
      value: mockFiberNode,
      enumerable: true,
    });

    const result = getFiberFromDomNode(mockNode);

    expect(result).toBe(mockFiberNode);
  });
});
