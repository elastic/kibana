/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberFromHtmlElement } from './get_fiber_from_html_element';
import type { ReactFiberNode } from './types';

describe('getFiberFromHtmlElement', () => {
  it('should return null when HTML element is null', () => {
    expect(getFiberFromHtmlElement(null)).toBeNull();
  });

  it('should return null when HTML element does not have a Fiber', () => {
    const mockElement = document.createElement('div');

    const result = getFiberFromHtmlElement(mockElement);

    expect(result).toBeNull();
  });

  it('should return the React Fiber node when Fiber exists', () => {
    const mockFiberNode = { tag: 5, type: 'div' } as unknown as ReactFiberNode;
    const mockElement = document.createElement('div');

    const fiberKey = '__reactFiber$abcdef';
    Object.defineProperty(mockElement, fiberKey, {
      value: mockFiberNode,
      enumerable: true,
    });

    const result = getFiberFromHtmlElement(mockElement);

    expect(result).toBe(mockFiberNode);
  });
});
