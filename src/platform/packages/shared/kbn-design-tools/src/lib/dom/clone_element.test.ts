/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneElement } from './clone_element';
import { DEVTOOL_MANAGED_ATTR } from '../constants';

describe('cloneElement', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    target.textContent = 'hello';
    target.getBoundingClientRect = () =>
      ({
        top: 10,
        left: 20,
        width: 100,
        height: 40,
        right: 120,
        bottom: 50,
        x: 20,
        y: 10,
        toJSON: () => {},
      } as DOMRect);
    document.body.appendChild(target);
  });

  afterEach(() => {
    target.remove();
  });

  it('should return a clone and the original rect', () => {
    const { clone, rect } = cloneElement(target, 9001);

    expect(clone).toBeInstanceOf(HTMLElement);
    expect(clone.textContent).toBe('hello');
    expect(rect.left).toBe(20);
    expect(rect.top).toBe(10);
  });

  it('should set the clone to fixed position at the original viewport coordinates', () => {
    const { clone } = cloneElement(target, 9001);

    expect(clone.style.position).toBe('fixed');
    expect(clone.style.left).toBe('20px');
    expect(clone.style.top).toBe('10px');
    expect(clone.style.width).toBe('100px');
    expect(clone.style.height).toBe('40px');
  });

    it('should set the devtool managed attribute', () => {
    const { clone } = cloneElement(target, 9001);

    expect(clone.hasAttribute(DEVTOOL_MANAGED_ATTR)).toBe(true);
  });

  it('should deep clone child elements', () => {
    const child = document.createElement('span');
    child.textContent = 'child';
    target.appendChild(child);

    const { clone } = cloneElement(target, 9001);

    expect(clone.querySelector('span')).not.toBeNull();
    expect(clone.querySelector('span')!.textContent).toBe('child');
  });
});
