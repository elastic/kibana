/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';

import { SIDE_PANEL_WIDTH } from './use_layout_width';
import {
  clampSidePanelWidth,
  getMaxSidePanelWidth,
  MIN_SIDE_PANEL_WIDTH,
  useSidePanelWidth,
} from './use_side_panel_width';
import { SIDE_PANEL_COLLAPSE_THRESHOLD } from '../utils/side_panel_width_utils';

describe('useSidePanelWidth', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
  });

  it('defaults to SIDE_PANEL_WIDTH', () => {
    const { result } = renderHook(() => useSidePanelWidth());
    expect(result.current.width).toBe(SIDE_PANEL_WIDTH);
  });

  it('loads persisted width from localStorage', () => {
    localStorage.setItem('core.chrome.sideNavSecondaryPanelWidth', '320');

    const { result } = renderHook(() => useSidePanelWidth());
    expect(result.current.width).toBe(320);
  });

  it('persists width changes to localStorage', () => {
    const { result } = renderHook(() => useSidePanelWidth());

    act(() => {
      result.current.setWidth(300);
    });

    expect(result.current.width).toBe(300);
    expect(localStorage.getItem('core.chrome.sideNavSecondaryPanelWidth')).toBe('300');
  });

  it('keeps the visible width at the minimum while dragging below it', () => {
    const { result } = renderHook(() => useSidePanelWidth());

    act(() => {
      result.current.setWidth(MIN_SIDE_PANEL_WIDTH);
      result.current.setDragWidth(MIN_SIDE_PANEL_WIDTH - 20);
    });

    expect(result.current.width).toBe(MIN_SIDE_PANEL_WIDTH);
  });

  it('snaps to the minimum on commit within the elastic zone', () => {
    const { result } = renderHook(() => useSidePanelWidth());

    act(() => {
      result.current.setWidth(220);
      result.current.setDragWidth(MIN_SIDE_PANEL_WIDTH - 10);
    });

    let shouldCollapse = false;
    act(() => {
      shouldCollapse = result.current.commitDragWidth(MIN_SIDE_PANEL_WIDTH - 10);
    });

    expect(shouldCollapse).toBe(false);
    expect(result.current.width).toBe(MIN_SIDE_PANEL_WIDTH);
    expect(localStorage.getItem('core.chrome.sideNavSecondaryPanelWidth')).toBe(
      String(MIN_SIDE_PANEL_WIDTH)
    );
  });

  it('requests collapse on commit past the collapse threshold', () => {
    const { result } = renderHook(() => useSidePanelWidth());

    act(() => {
      result.current.setWidth(220);
    });

    let shouldCollapse = false;
    act(() => {
      shouldCollapse = result.current.commitDragWidth(SIDE_PANEL_COLLAPSE_THRESHOLD - 1);
    });

    expect(shouldCollapse).toBe(true);
    expect(result.current.width).toBe(220);
    expect(localStorage.getItem('core.chrome.sideNavSecondaryPanelWidth')).toBe('220');
  });
});

describe('clampSidePanelWidth export', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
  });

  it('uses the updated minimum width', () => {
    expect(clampSidePanelWidth(100)).toBe(MIN_SIDE_PANEL_WIDTH);
    expect(clampSidePanelWidth(999)).toBe(getMaxSidePanelWidth());
  });
});
