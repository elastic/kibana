/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getElementUnder } from './get_element_under';
import type { ElementOffset } from './get_element_under';
import { DEVELOPER_TOOLBAR_ID, DEVTOOL_CLONE_ATTR, DEVTOOL_IGNORE_ATTR } from '../constants';

describe('getElementUnder', () => {
  let originalElementsFromPoint: typeof document.elementsFromPoint;

  beforeEach(() => {
    originalElementsFromPoint = document.elementsFromPoint;
  });

  afterEach(() => {
    document.elementsFromPoint = originalElementsFromPoint;
  });

  const makeEntry = (el: HTMLElement, clone: HTMLElement | null = null): ElementOffset => ({
    el,
    clone,
    dx: 0,
    dy: 0,
    dw: 0,
    dh: 0,
    originalTransform: '',
    originalRect: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: () => ({}),
    } as DOMRect,
    scrollX: 0,
    scrollY: 0,
  });

  it('should return a regular HTML element', () => {
    const div = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([div]);

    expect(getElementUnder(10, 10, [])).toBe(div);
  });

  it('should return null when no elements are found', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([]);

    expect(getElementUnder(10, 10, [])).toBeNull();
  });

  it('should return a clone element directly', () => {
    const clone = document.createElement('div');
    clone.setAttribute(DEVTOOL_CLONE_ATTR, '');
    document.elementsFromPoint = jest.fn().mockReturnValue([clone]);

    expect(getElementUnder(10, 10, [])).toBe(clone);
  });

  it('should return the clone root when clicking a child inside a clone', () => {
    const clone = document.createElement('div');
    clone.setAttribute(DEVTOOL_CLONE_ATTR, '');
    const child = document.createElement('span');
    clone.appendChild(child);
    document.body.appendChild(clone);

    document.elementsFromPoint = jest.fn().mockReturnValue([child]);

    expect(getElementUnder(10, 10, [])).toBe(clone);

    clone.remove();
  });

  it('should return null for ignored elements (toolbar)', () => {
    const toolbar = document.createElement('div');
    toolbar.id = DEVELOPER_TOOLBAR_ID;
    document.elementsFromPoint = jest.fn().mockReturnValue([toolbar]);

    expect(getElementUnder(10, 10, [])).toBeNull();
  });

  it('should return null for data-devtool-ignore elements', () => {
    const ignored = document.createElement('div');
    ignored.setAttribute(DEVTOOL_IGNORE_ATTR, '');
    document.elementsFromPoint = jest.fn().mockReturnValue([ignored]);

    expect(getElementUnder(10, 10, [])).toBeNull();
  });

  it('should skip hidden elements and return the next valid one', () => {
    const hidden = document.createElement('div');
    hidden.style.visibility = 'hidden';
    const visible = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([hidden, visible]);

    expect(getElementUnder(10, 10, [])).toBe(visible);
  });

  it('should skip elements that have a living clone in movedElements', () => {
    const original = document.createElement('div');
    const clone = document.createElement('div');
    const behind = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([original, behind]);

    const movedElements = [makeEntry(original, clone)];

    expect(getElementUnder(10, 10, movedElements)).toBe(behind);
  });

  it('should not skip elements in movedElements that have no clone', () => {
    const original = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([original]);

    const movedElements = [makeEntry(original, null)];

    expect(getElementUnder(10, 10, movedElements)).toBe(original);
  });

  it('should skip non-HTMLElement nodes', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const div = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([svg, div]);

    expect(getElementUnder(10, 10, [])).toBe(div);
  });
});
