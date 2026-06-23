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

    renderHook(() => useLayoutWidth({ hidePrimaryLabels: true, isSidePanelOpen: false, setWidth }));

    expect(setWidth).toHaveBeenCalledWith(COLLAPSED_WIDTH);
  });

  it('adds the side panel width when the side panel is open', () => {
    const setWidth = jest.fn();

    renderHook(() => useLayoutWidth({ hidePrimaryLabels: false, isSidePanelOpen: true, setWidth }));

    expect(setWidth).toHaveBeenNthCalledWith(1, EXPANDED_WIDTH + SIDE_PANEL_WIDTH);
  });

  it('updates when dependencies change', () => {
    const setWidth = jest.fn();
    const { rerender } = renderHook(
      (props: { hidePrimaryLabels: boolean; isSidePanelOpen: boolean; sidePanelWidth?: number }) =>
        useLayoutWidth({ ...props, setWidth }),
      {
        initialProps: { hidePrimaryLabels: false, isSidePanelOpen: false },
      }
    );

    setWidth.mockClear();

    rerender({ hidePrimaryLabels: true, isSidePanelOpen: true });

    expect(setWidth).toHaveBeenNthCalledWith(1, COLLAPSED_WIDTH + SIDE_PANEL_WIDTH);
  });

  it('uses custom side panel width when provided', () => {
    const setWidth = jest.fn();

    renderHook(() =>
      useLayoutWidth({
        hidePrimaryLabels: false,
        isSidePanelOpen: true,
        sidePanelWidth: 320,
        setWidth,
      })
    );

    expect(setWidth).toHaveBeenCalledWith(EXPANDED_WIDTH + 320);
  });
});
