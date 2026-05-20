/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveHoverTarget } from './resolve_hover_target';
import { makeRect } from '../lib/tests/helpers';

const mockGetElementUnder = jest.fn<HTMLElement | null, [number, number]>();
jest.mock('../lib/dom/get_element_under', () => ({
  getElementUnder: (x: number, y: number) => mockGetElementUnder(x, y),
}));

const mockFindNearHandle = jest.fn();
jest.mock('./resize_helpers', () => ({
  findNearHandle: (...args: unknown[]) => mockFindNearHandle(...args),
}));

const mockIsInRoundedDeadZone = jest.fn<boolean, [number, number, DOMRect]>();
const mockHasSignificantRounding = jest.fn<boolean, [HTMLElement]>();
jest.mock('./rounded_dead_zone', () => ({
  isInRoundedDeadZone: (...args: unknown[]) =>
    mockIsInRoundedDeadZone(...(args as [number, number, DOMRect])),
  hasSignificantRounding: (...args: unknown[]) =>
    mockHasSignificantRounding(...(args as [HTMLElement])),
}));

describe('resolveHoverTarget', () => {
  let currentTarget: HTMLElement;
  const noLock = () => false;

  beforeEach(() => {
    jest.resetAllMocks();
    currentTarget = document.createElement('div');
    currentTarget.getBoundingClientRect = () => makeRect(50, 50, 100, 40);
  });

  it('should return null target and no handle when nothing is under the pointer', () => {
    mockGetElementUnder.mockReturnValue(null);

    const result = resolveHoverTarget(300, 300, null, noLock, false);

    expect(result.target).toBeNull();
    expect(result.handle).toBeNull();
    expect(result.isRounded).toBe(false);
  });

  it('should return the element under the pointer with no handle for normal hover', () => {
    const el = document.createElement('div');
    mockGetElementUnder.mockReturnValue(el);
    mockFindNearHandle.mockReturnValue(null);
    mockHasSignificantRounding.mockReturnValue(false);

    const result = resolveHoverTarget(100, 100, null, noLock, false);

    expect(result.target).toBe(el);
    expect(result.handle).toBeNull();
    expect(result.isRounded).toBe(false);
  });

  it('should detect resize handle on current target in hover-lock zone', () => {
    const lockFn = jest.fn().mockReturnValue(true);
    mockFindNearHandle.mockReturnValue('se');

    const result = resolveHoverTarget(100, 100, currentTarget, lockFn, false);

    expect(result.target).toBe(currentTarget);
    expect(result.handle).toBe('se');
  });

  it('should keep current target in hover-lock zone with no handle', () => {
    const lockFn = jest.fn().mockReturnValue(true);
    mockFindNearHandle.mockReturnValue(null);

    const result = resolveHoverTarget(100, 100, currentTarget, lockFn, false);

    expect(result.target).toBe(currentTarget);
    expect(result.handle).toBeNull();
  });

  it('should detect resize handle on current target before switching to new target', () => {
    const newTarget = document.createElement('span');
    mockGetElementUnder.mockReturnValue(newTarget);
    mockFindNearHandle.mockReturnValue('n');

    const result = resolveHoverTarget(100, 60, currentTarget, noLock, false);

    expect(result.target).toBe(currentTarget);
    expect(result.handle).toBe('n');
  });

  it('should keep target in rounded dead-zone when pointer leaves rounded element', () => {
    const newTarget = document.createElement('span');
    mockGetElementUnder.mockReturnValue(newTarget);
    // First call: handle check on current target before element lookup — no handle
    // Second call: dead-zone handle check — still no handle
    // Third call: final fallback handle check — no handle
    mockFindNearHandle.mockReturnValue(null);
    mockIsInRoundedDeadZone.mockReturnValue(true);

    const result = resolveHoverTarget(55, 55, currentTarget, noLock, true);

    expect(result.target).toBe(currentTarget);
    expect(mockIsInRoundedDeadZone).toHaveBeenCalled();
  });

  it('should skip dead-zone check when new target is a child of current target', () => {
    const child = document.createElement('span');
    currentTarget.appendChild(child);
    mockGetElementUnder.mockReturnValue(child);
    mockFindNearHandle.mockReturnValue(null);
    mockHasSignificantRounding.mockReturnValue(false);

    const result = resolveHoverTarget(70, 70, currentTarget, noLock, true);

    expect(result.target).toBe(child);
    expect(mockIsInRoundedDeadZone).not.toHaveBeenCalled();
  });

  it('should mark new target as rounded when it has significant rounding', () => {
    const roundedEl = document.createElement('div');
    mockGetElementUnder.mockReturnValue(roundedEl);
    mockFindNearHandle.mockReturnValue(null);
    mockHasSignificantRounding.mockReturnValue(true);

    const result = resolveHoverTarget(200, 200, null, noLock, false);

    expect(result.target).toBe(roundedEl);
    expect(result.isRounded).toBe(true);
  });

  it('should switches to new target when current target has no rounding and pointer moves away', () => {
    const newTarget = document.createElement('div');
    mockGetElementUnder.mockReturnValue(newTarget);
    mockFindNearHandle.mockReturnValue(null);
    mockHasSignificantRounding.mockReturnValue(false);

    const result = resolveHoverTarget(300, 300, currentTarget, noLock, false);

    expect(result.target).toBe(newTarget);
    expect(result.handle).toBeNull();
  });
});
