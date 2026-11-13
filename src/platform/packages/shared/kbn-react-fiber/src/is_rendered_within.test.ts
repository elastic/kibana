/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRenderedWithin } from './is_rendered_within';
import type { ReactFiberNode } from './types';

const attachFiber = (element: Element, fiber: ReactFiberNode) =>
  Object.defineProperty(element, '__reactFiber$abcdef', { value: fiber, enumerable: true });

describe('isRenderedWithin', () => {
  const container = document.createElement('div');
  const containerFiber: ReactFiberNode = { type: 'div', stateNode: container };

  it('should accept DOM descendants and content portalled out of the container', () => {
    const descendant = document.createElement('span');
    container.appendChild(descendant);
    // a portal places the DOM elsewhere while its fibers stay below the container
    const portalled = document.createElement('div');
    attachFiber(portalled, { type: 'div', return: { type: null, return: containerFiber } });

    expect(isRenderedWithin(descendant, container)).toBe(true);
    expect(isRenderedWithin(portalled, container)).toBe(true);
  });

  it('should reject elements rendered elsewhere', () => {
    const elsewhere = document.createElement('div');
    attachFiber(elsewhere, { type: 'div', return: { type: 'div', stateNode: document.body } });

    expect(isRenderedWithin(elsewhere, container)).toBe(false);
    expect(isRenderedWithin(document.createElement('div'), container)).toBe(false);
  });
});
