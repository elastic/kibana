/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findFiberWithDebugSource } from './find_fiber_with_debug_source';
import type { DebugSource, ReactFiberNode } from './types';

const source: DebugSource = { fileName: 'test.tsx', lineNumber: 10, columnNumber: 5 };

const attachFiber = (element: HTMLElement, fiber: ReactFiberNode) =>
  Object.defineProperty(element, '__reactFiber$test', { value: fiber, enumerable: true });

describe('findFiberWithDebugSource', () => {
  it('should return the first owner with source information together with the element', () => {
    const owner: ReactFiberNode = { type: { name: 'Panel' }, _debugSource: source };
    const element = document.createElement('div');
    attachFiber(element, { type: 'div', _debugOwner: owner });

    expect(findFiberWithDebugSource(element)).toEqual({ element, fiber: owner, source });
  });

  it('should climb the DOM when the element and its fiber chain have no source', () => {
    const parent = document.createElement('section');
    const parentFiber: ReactFiberNode = { type: 'section', _debugSource: source };
    attachFiber(parent, parentFiber);
    const element = parent.appendChild(document.createElement('div'));
    attachFiber(element, { type: 'div' });

    expect(findFiberWithDebugSource(element)).toEqual({
      element: parent,
      fiber: parentFiber,
      source,
    });
  });

  it('should return null when nothing has source information', () => {
    expect(findFiberWithDebugSource(document.createElement('div'))).toBeNull();
  });
});
