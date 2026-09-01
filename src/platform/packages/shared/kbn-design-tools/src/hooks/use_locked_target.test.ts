/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useLockedTarget } from './use_locked_target';

describe('useLockedTarget', () => {
  it('should return null when inactive', () => {
    const el = document.createElement('div');
    const { result } = renderHook(() => useLockedTarget(el, false));
    expect(result.current).toBeNull();
  });

  it('should return null when candidate is null', () => {
    const { result } = renderHook(() => useLockedTarget(null, true));
    expect(result.current).toBeNull();
  });

  it('should lock to the first candidate', () => {
    const el = document.createElement('div');
    const { result } = renderHook(() => useLockedTarget(el, true));
    expect(result.current).toBe(el);
  });

  it('should keep locked target when candidate is a parent (ancestor)', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    // First lock to the child
    const { result, rerender } = renderHook(
      ({ candidate, active }) => useLockedTarget(candidate, active),
      { initialProps: { candidate: child, active: true } }
    );
    expect(result.current).toBe(child);

    // Now candidate becomes the parent — should keep child locked
    rerender({ candidate: parent, active: true });
    expect(result.current).toBe(child);
  });

  it('should update to a new unrelated element', () => {
    const el1 = document.createElement('div');
    const el2 = document.createElement('span');

    const { result, rerender } = renderHook(
      ({ candidate, active }) => useLockedTarget(candidate, active),
      { initialProps: { candidate: el1 as HTMLElement, active: true } }
    );
    expect(result.current).toBe(el1);

    rerender({ candidate: el2, active: true });
    expect(result.current).toBe(el2);
  });

  it('should update to a child element (drills down)', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    const { result, rerender } = renderHook(
      ({ candidate, active }) => useLockedTarget(candidate, active),
      { initialProps: { candidate: parent as HTMLElement, active: true } }
    );
    expect(result.current).toBe(parent);

    // Child — parent.contains(child) is true, so child doesn't contain parent → updates
    rerender({ candidate: child, active: true });
    expect(result.current).toBe(child);
  });

  it('should clear when deactivated', () => {
    const el = document.createElement('div');
    const { result, rerender } = renderHook(
      ({ candidate, active }) => useLockedTarget(candidate, active),
      { initialProps: { candidate: el, active: true } }
    );
    expect(result.current).toBe(el);

    rerender({ candidate: el, active: false });
    expect(result.current).toBeNull();
  });
});
