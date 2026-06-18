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
  useSidePanelWidth,
} from './use_side_panel_width';

describe('clampSidePanelWidth', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
  });

  it('clamps width to min and max bounds', () => {
    expect(clampSidePanelWidth(100)).toBe(200);
    expect(clampSidePanelWidth(999)).toBe(getMaxSidePanelWidth());
    expect(clampSidePanelWidth(300)).toBe(300);
  });
});

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
});
