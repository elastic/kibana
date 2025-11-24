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
  it('sets the collapsed width when the navigation is collapsed', () => {
    const setWidth = jest.fn();

    renderHook(() => useLayoutWidth({ isCollapsed: true, isSidePanelOpen: false, setWidth }));

    expect(setWidth).toHaveBeenCalledWith(COLLAPSED_WIDTH);
  });

  it('adds the side panel width when the side panel is open', () => {
    const setWidth = jest.fn();

    renderHook(() => useLayoutWidth({ isCollapsed: false, isSidePanelOpen: true, setWidth }));

    expect(setWidth).toHaveBeenNthCalledWith(1, EXPANDED_WIDTH + SIDE_PANEL_WIDTH);
  });

  it('updates when dependencies change', () => {
    const setWidth = jest.fn();
    const { rerender } = renderHook(
      (props: { isCollapsed: boolean; isSidePanelOpen: boolean }) =>
        useLayoutWidth({ ...props, setWidth }),
      {
        initialProps: { isCollapsed: false, isSidePanelOpen: false },
      }
    );

    setWidth.mockClear();

    rerender({ isCollapsed: true, isSidePanelOpen: true });

    expect(setWidth).toHaveBeenNthCalledWith(1, COLLAPSED_WIDTH + SIDE_PANEL_WIDTH);
  });
});
