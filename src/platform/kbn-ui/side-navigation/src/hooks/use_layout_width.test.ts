/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import {
  COLLAPSED_WIDTH,
  EXPANDED_WIDTH,
  SIDE_PANEL_WIDTH,
  useLayoutWidth,
} from './use_layout_width';

describe('useLayoutWidth', () => {
  it('sets the expanded primary width when the side panel is closed', () => {
    const setWidth = jest.fn();

    renderHook(() =>
      useLayoutWidth({ isSidePanelOpen: false, showPrimaryItemLabels: true, setWidth })
    );

    expect(setWidth).toHaveBeenCalledWith(EXPANDED_WIDTH);
  });

  it('sets the collapsed primary width when labels are hidden', () => {
    const setWidth = jest.fn();

    renderHook(() =>
      useLayoutWidth({ isSidePanelOpen: false, showPrimaryItemLabels: false, setWidth })
    );

    expect(setWidth).toHaveBeenCalledWith(COLLAPSED_WIDTH);
  });

  it('adds the side panel width when the side panel is open', () => {
    const setWidth = jest.fn();

    renderHook(() =>
      useLayoutWidth({ isSidePanelOpen: true, showPrimaryItemLabels: true, setWidth })
    );

    expect(setWidth).toHaveBeenNthCalledWith(1, EXPANDED_WIDTH + SIDE_PANEL_WIDTH);
  });

  it('updates when the side panel open state changes', () => {
    const setWidth = jest.fn();
    const { rerender } = renderHook(
      (props: { isSidePanelOpen: boolean; showPrimaryItemLabels: boolean }) =>
        useLayoutWidth({ ...props, setWidth }),
      {
        initialProps: { isSidePanelOpen: false, showPrimaryItemLabels: true },
      }
    );

    setWidth.mockClear();

    rerender({ isSidePanelOpen: true, showPrimaryItemLabels: true });

    expect(setWidth).toHaveBeenNthCalledWith(1, EXPANDED_WIDTH + SIDE_PANEL_WIDTH);
  });
});
