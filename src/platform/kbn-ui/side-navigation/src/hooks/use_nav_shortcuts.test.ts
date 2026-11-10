/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';

import { PRIMARY_NAVIGATION_ID } from '../constants';
import {
  getNavShortcutModifierKey,
  MAX_NAV_SHORTCUT_ITEMS,
  NAV_SHORTCUT_REVEAL_DELAY_MS,
  useNavShortcuts,
} from './use_nav_shortcuts';

const modifierKey = getNavShortcutModifierKey();

const modifierFlags = (held: boolean) =>
  modifierKey === 'Meta' ? { metaKey: held } : { ctrlKey: held };

const items = [
  { id: 'one' },
  { id: 'two' },
  { id: 'three' },
  { id: 'four' },
  { id: 'five' },
  { id: 'six' },
  { id: 'seven' },
  { id: 'eight' },
  { id: 'nine' },
  { id: 'ten' },
];

const dispatchKey = (type: 'keydown' | 'keyup', key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(event);
  return event;
};

const holdModifier = () => {
  dispatchKey('keydown', modifierKey);
};

const revealShortcuts = () => {
  holdModifier();
  act(() => {
    jest.advanceTimersByTime(NAV_SHORTCUT_REVEAL_DELAY_MS);
  });
};

describe('useNavShortcuts', () => {
  let root: HTMLElement;
  const clicks: Record<string, jest.Mock> = {};

  beforeEach(() => {
    jest.useFakeTimers();

    root = document.createElement('nav');
    root.id = PRIMARY_NAVIGATION_ID;

    items.forEach((item) => {
      const anchor = document.createElement('a');
      anchor.id = item.id;
      anchor.href = `/${item.id}`;
      clicks[item.id] = jest.fn();
      anchor.addEventListener('click', clicks[item.id]);
      root.appendChild(anchor);
    });

    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it('reveals shortcuts only after the modifier is held past the delay', () => {
    const { result } = renderHook(() => useNavShortcuts(items));

    act(() => {
      holdModifier();
    });

    expect(result.current.visible).toBe(false);

    act(() => {
      jest.advanceTimersByTime(NAV_SHORTCUT_REVEAL_DELAY_MS - 1);
    });

    expect(result.current.visible).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current.visible).toBe(true);
  });

  it('does not reveal when the modifier is released before the delay', () => {
    const { result } = renderHook(() => useNavShortcuts(items));

    act(() => {
      holdModifier();
      dispatchKey('keyup', modifierKey);
      jest.advanceTimersByTime(NAV_SHORTCUT_REVEAL_DELAY_MS);
    });

    expect(result.current.visible).toBe(false);
  });

  it('does not reveal when another key is pressed before the delay', () => {
    const { result } = renderHook(() => useNavShortcuts(items));

    act(() => {
      holdModifier();
      dispatchKey('keydown', 't', modifierFlags(true));
      jest.advanceTimersByTime(NAV_SHORTCUT_REVEAL_DELAY_MS);
    });

    expect(result.current.visible).toBe(false);
  });

  it('hides shortcuts when the modifier is released', () => {
    const { result } = renderHook(() => useNavShortcuts(items));

    act(() => {
      revealShortcuts();
    });

    expect(result.current.visible).toBe(true);

    act(() => {
      dispatchKey('keyup', modifierKey);
    });

    expect(result.current.visible).toBe(false);
  });

  it('hides shortcuts when the window blurs or the tab is hidden', () => {
    const { result } = renderHook(() => useNavShortcuts(items));

    act(() => {
      revealShortcuts();
    });

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });

    expect(result.current.visible).toBe(false);

    act(() => {
      revealShortcuts();
    });

    const visibilityState = jest
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.visible).toBe(false);

    visibilityState.mockRestore();
  });

  it('activates only the matching visible item and then hides the badges', () => {
    const { result } = renderHook(() => useNavShortcuts(items.slice(0, 3)));

    act(() => {
      revealShortcuts();
    });

    let event: KeyboardEvent;

    act(() => {
      event = dispatchKey('keydown', '2', modifierFlags(true));
    });

    expect(clicks.two).toHaveBeenCalledTimes(1);
    expect(clicks.one).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.visible).toBe(false);
  });

  it('activates the ninth item and leaves items past it alone', () => {
    renderHook(() => useNavShortcuts(items));

    act(() => {
      revealShortcuts();
    });

    act(() => {
      dispatchKey('keydown', '9', modifierFlags(true));
    });

    expect(clicks.nine).toHaveBeenCalledTimes(1);
    expect(clicks.ten).not.toHaveBeenCalled();
    expect(items).toHaveLength(MAX_NAV_SHORTCUT_ITEMS + 1);
  });

  it('does nothing for a digit that has no matching item', () => {
    const { result } = renderHook(() => useNavShortcuts(items.slice(0, 3)));

    act(() => {
      revealShortcuts();
    });

    act(() => {
      dispatchKey('keydown', '4', modifierFlags(true));
    });

    expect(clicks.four).not.toHaveBeenCalled();
    expect(result.current.visible).toBe(true);
  });

  it('does not activate on a digit chord before badges are visible, or with shift, or on repeat', () => {
    renderHook(() => useNavShortcuts(items.slice(0, 3)));

    act(() => {
      holdModifier();
      dispatchKey('keydown', '1', modifierFlags(true));
      dispatchKey('keyup', modifierKey);
    });

    expect(clicks.one).not.toHaveBeenCalled();

    act(() => {
      revealShortcuts();
    });

    act(() => {
      dispatchKey('keydown', '1', { ...modifierFlags(true), shiftKey: true });
      dispatchKey('keydown', '1', { ...modifierFlags(true), repeat: true });
    });

    expect(clicks.one).not.toHaveBeenCalled();
  });

  it('does not activate when another handler already prevented the digit', () => {
    renderHook(() => useNavShortcuts(items.slice(0, 3)));

    act(() => {
      revealShortcuts();
    });

    const event = new KeyboardEvent('keydown', {
      key: '1',
      bubbles: true,
      cancelable: true,
      ...modifierFlags(true),
    });
    event.preventDefault();
    window.dispatchEvent(event);

    expect(clicks.one).not.toHaveBeenCalled();
  });
});
