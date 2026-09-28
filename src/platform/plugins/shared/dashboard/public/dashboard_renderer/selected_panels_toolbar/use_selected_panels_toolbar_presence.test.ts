/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, renderHook } from '@testing-library/react';
import { useSelectedPanelsToolbarPresence } from './use_selected_panels_toolbar_presence';

const selected = new Set(['a', 'b']);
const none = new Set<string>();

const setup = (initial: Set<string>) =>
  renderHook(({ ids }) => useSelectedPanelsToolbarPresence(ids), {
    initialProps: { ids: initial },
  });

describe('useSelectedPanelsToolbarPresence', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('the toolbar leaves instantly, and the hint bar fades in after a pointer interaction', () => {
    const { result, rerender } = setup(selected);
    expect(result.current.showToolbar).toBe(true);

    fireEvent.pointerDown(document);
    rerender({ ids: none });
    expect(result.current.showToolbar).toBe(false);
    expect(result.current.animateHintBarIn).toBe(true);
  });

  test('the hint bar appears instantly after a keyboard action', () => {
    const { result, rerender } = setup(selected);
    fireEvent.keyDown(document, { key: 'Escape' });
    rerender({ ids: none });
    expect(result.current.showToolbar).toBe(false);
    expect(result.current.animateHintBarIn).toBe(false);
  });

  test('holding a modifier for Shift+click still counts as a pointer interaction', () => {
    const { result, rerender } = setup(selected);
    fireEvent.pointerDown(document);
    fireEvent.keyDown(document, { key: 'Shift' });
    rerender({ ids: none });
    expect(result.current.animateHintBarIn).toBe(true);
  });

  test('skips the entrance when re-selecting right after the toolbar left', () => {
    const { result, rerender } = setup(selected);
    rerender({ ids: none });

    rerender({ ids: selected });
    expect(result.current.showToolbar).toBe(true);
    expect(result.current.skipEntrance).toBe(true);

    rerender({ ids: none });
    act(() => jest.advanceTimersByTime(2000));
    rerender({ ids: selected });
    expect(result.current.skipEntrance).toBe(false);
  });
});
