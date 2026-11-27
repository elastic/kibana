/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useShortcutToggle } from './use_shortcut_toggle';

describe('useShortcutToggle', () => {
  it('should toggle isActive when the shortcut matches', () => {
    const isShortcut = (event: KeyboardEvent) => event.key === 'm';
    const { result } = renderHook(() => useShortcutToggle(isShortcut));

    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.handleKeydown(new KeyboardEvent('keydown', { key: 'm' }));
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.handleKeydown(new KeyboardEvent('keydown', { key: 'm' }));
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should not toggle isActive when the shortcut does not match', () => {
    const isShortcut = () => false;
    const { result } = renderHook(() => useShortcutToggle(isShortcut));

    act(() => {
      result.current.handleKeydown(new KeyboardEvent('keydown', { key: 'x' }));
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should call preventDefault only when the shortcut matches', () => {
    const isShortcut = (event: KeyboardEvent) => event.key === 'm';
    const { result } = renderHook(() => useShortcutToggle(isShortcut));

    const matchingEvent = new KeyboardEvent('keydown', { key: 'm' });
    const matchingPreventDefault = jest.spyOn(matchingEvent, 'preventDefault');

    act(() => {
      result.current.handleKeydown(matchingEvent);
    });

    expect(matchingPreventDefault).toHaveBeenCalled();

    const nonMatchingEvent = new KeyboardEvent('keydown', { key: 'x' });
    const nonMatchingPreventDefault = jest.spyOn(nonMatchingEvent, 'preventDefault');

    act(() => {
      result.current.handleKeydown(nonMatchingEvent);
    });

    expect(nonMatchingPreventDefault).not.toHaveBeenCalled();
  });
});
