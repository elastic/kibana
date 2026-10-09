/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from './use_keyboard_shortcut';

let mockIsMac = true;
jest.mock('./platform', () => ({
  get isMac() {
    return mockIsMac;
  },
  getPlatform: () => (mockIsMac ? 'mac' : 'windows'),
}));

const dispatch = (opts: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...opts });
  document.dispatchEvent(event);
  return event;
};

describe('useKeyboardShortcut', () => {
  afterEach(() => {
    mockIsMac = true;
  });

  it('fires callback on matching meta+key (Mac)', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut({ key: '/', meta: true }, callback));

    dispatch({ key: '/', metaKey: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fires callback on matching ctrl+key (Windows)', () => {
    mockIsMac = false;
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut({ key: '/', meta: true }, callback));

    dispatch({ key: '/', ctrlKey: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire when key does not match', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut({ key: '/', meta: true }, callback));

    dispatch({ key: 'k', metaKey: true });
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls preventDefault on match', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut({ key: '/', meta: true }, callback));

    const event = dispatch({ key: '/', metaKey: true });
    expect(event.defaultPrevented).toBe(true);
  });
});
