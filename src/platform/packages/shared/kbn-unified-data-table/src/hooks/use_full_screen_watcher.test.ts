/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import {
  EUI_DATA_GRID_FULL_SCREEN_CLASS,
  UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS,
  EUI_DATA_GRID_RESTRICT_BODY_CLASS,
  useFullScreenWatcher,
  useIsDataGridFullScreen,
} from './use_full_screen_watcher';

describe('useFullScreenWatcher', () => {
  it(`should add and remove ${UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS} class from the body when toggling full screen`, async () => {
    const { result } = renderHook(() => useFullScreenWatcher());
    const dataGridWrapper = document.createElement('div');
    document.body.appendChild(dataGridWrapper);
    act(() => {
      result.current.setDataGridWrapper(dataGridWrapper);
    });
    const dataGrid = document.createElement('div');
    dataGrid.id = result.current.dataGridId;
    dataGridWrapper.appendChild(dataGrid);
    await nextTick();
    expect(document.body).not.toHaveClass(UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS);
    dataGrid.classList.add(EUI_DATA_GRID_FULL_SCREEN_CLASS);
    await nextTick();
    expect(document.body).toHaveClass(UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS);
    dataGrid.classList.remove(EUI_DATA_GRID_FULL_SCREEN_CLASS);
    await nextTick();
    expect(document.body).not.toHaveClass(UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS);
  });
});

describe('useIsDataGridFullScreen', () => {
  afterEach(() => {
    document.body.classList.remove(EUI_DATA_GRID_RESTRICT_BODY_CLASS);
  });

  it('should return false when no data grid is in fullscreen', () => {
    const { result } = renderHook(() => useIsDataGridFullScreen());
    expect(result.current).toBe(false);
  });

  it('should return true when data grid is in fullscreen', () => {
    document.body.classList.add(EUI_DATA_GRID_RESTRICT_BODY_CLASS);
    const { result } = renderHook(() => useIsDataGridFullScreen());
    expect(result.current).toBe(true);
  });

  it('should reactively update when body class changes', async () => {
    const { result } = renderHook(() => useIsDataGridFullScreen());
    expect(result.current).toBe(false);

    document.body.classList.add(EUI_DATA_GRID_RESTRICT_BODY_CLASS);
    await nextTick();
    expect(result.current).toBe(true);

    document.body.classList.remove(EUI_DATA_GRID_RESTRICT_BODY_CLASS);
    await nextTick();
    expect(result.current).toBe(false);
  });
});

const nextTick = () => {
  return act(() => {
    return new Promise((resolve) =>
      requestAnimationFrame(() => {
        resolve(null);
      })
    );
  });
};
