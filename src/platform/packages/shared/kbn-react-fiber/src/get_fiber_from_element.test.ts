/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFiberFromElement } from './get_fiber_from_element';
import type { ReactFiberNode } from './types';

describe('getFiberFromElement', () => {
  it('should return null without an element or without a fiber attached', () => {
    expect(getFiberFromElement(null)).toBeNull();
    expect(getFiberFromElement(document.createElement('div'))).toBeNull();
  });

  it('should return the fiber stored under the React fiber key', () => {
    const fiber: ReactFiberNode = { type: 'div' };
    const element = document.createElement('div');
    Object.defineProperty(element, '__reactFiber$abcdef', { value: fiber, enumerable: true });

    expect(getFiberFromElement(element)).toBe(fiber);
  });
});
