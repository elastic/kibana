/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberFromDomElement } from './get_fiber_from_dom_element';
import type { ReactFiberNode } from './types';

describe('getFiberFromDomElement', () => {
  it('should return null when DOM element is null', () => {
    expect(getFiberFromDomElement(null)).toBeNull();
  });

  it('should return undefined when DOM element does not have a fiber key', () => {
    const mockElement = document.createElement('div');

    const result = getFiberFromDomElement(mockElement);

    expect(result).toBeUndefined();
  });

  it('should return the fiber node when fiber key exists', () => {
    const mockFiberNode = { tag: 5, type: 'div' } as unknown as ReactFiberNode;
    const mockElement = document.createElement('div');

    const fiberKey = '__reactFiber$abcdef';
    Object.defineProperty(mockElement, fiberKey, {
      value: mockFiberNode,
      enumerable: true,
    });

    const result = getFiberFromDomElement(mockElement);

    expect(result).toBe(mockFiberNode);
  });

  it('should find the correct fiber key when multiple keys exist', () => {
    const mockFiberNode = { tag: 5, type: 'div' } as unknown as ReactFiberNode;
    const mockElement = document.createElement('div');

    Object.defineProperty(mockElement, 'regularProperty', {
      value: 'test',
      enumerable: true,
    });

    const fiberKey = '__reactFiber$abcdef';

    Object.defineProperty(mockElement, fiberKey, {
      value: mockFiberNode,
      enumerable: true,
    });

    const result = getFiberFromDomElement(mockElement);

    expect(result).toBe(mockFiberNode);
  });
});
