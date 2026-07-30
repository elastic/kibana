/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getElementUnder } from './get_element_under';
import { DEVELOPER_TOOLBAR_ID, DEVTOOL_MANAGED_ATTR, DEVTOOL_HIDDEN_ATTR } from '../constants';

describe('getElementUnder', () => {
  let originalElementsFromPoint: typeof document.elementsFromPoint;

  beforeEach(() => {
    originalElementsFromPoint = document.elementsFromPoint;
  });

  afterEach(() => {
    document.elementsFromPoint = originalElementsFromPoint;
  });

  it('should return a regular HTML element', () => {
    const div = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([div]);

    expect(getElementUnder(10, 10)).toBe(div);
  });

  it('should return null when no elements are found', () => {
    document.elementsFromPoint = jest.fn().mockReturnValue([]);

    expect(getElementUnder(10, 10)).toBeNull();
  });

  it('should return a managed element directly', () => {
    const clone = document.createElement('div');
    clone.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    document.elementsFromPoint = jest.fn().mockReturnValue([clone]);

    expect(getElementUnder(10, 10)).toBe(clone);
  });

  it('should return the managed element root when clicking a child inside it', () => {
    const clone = document.createElement('div');
    clone.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const child = document.createElement('span');
    clone.appendChild(child);
    document.body.appendChild(clone);

    document.elementsFromPoint = jest.fn().mockReturnValue([child]);

    expect(getElementUnder(10, 10)).toBe(clone);

    clone.remove();
  });

  it('should return null for ignored elements (toolbar)', () => {
    const toolbar = document.createElement('div');
    toolbar.id = DEVELOPER_TOOLBAR_ID;
    document.elementsFromPoint = jest.fn().mockReturnValue([toolbar]);

    expect(getElementUnder(10, 10)).toBeNull();
  });

  it('should skip hidden elements and return the next valid one', () => {
    const hidden = document.createElement('div');
    hidden.style.visibility = 'hidden';
    const visible = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([hidden, visible]);

    expect(getElementUnder(10, 10)).toBe(visible);
  });

  it('should skip elements marked with DEVTOOL_HIDDEN_ATTR', () => {
    const original = document.createElement('div');
    original.setAttribute(DEVTOOL_HIDDEN_ATTR, '');
    const behind = document.createElement('div');
    document.elementsFromPoint = jest.fn().mockReturnValue([original, behind]);

    expect(getElementUnder(10, 10)).toBe(behind);
  });
});
