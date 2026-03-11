/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RenderHookResult } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import { createLocalStorageMock } from '../../__mocks__/local_storage_mock';
import type { UseRowHeightProps } from './use_row_height';
import { RowHeightType, useRowHeight } from './use_row_height';
import { RowHeightMode } from '../components/row_height_settings';

const CONFIG_ROW_HEIGHT = 3;

const renderRowHeightHook = (
  {
    previousRowHeight,
    previousConfigRowHeight,
    configRowHeight = CONFIG_ROW_HEIGHT,
    defaultRowHeight = CONFIG_ROW_HEIGHT,
    rowHeightState,
    onUpdateRowHeight,
  }: {
    previousRowHeight?: number;
    previousConfigRowHeight?: number;
    rowHeightState?: number;
    configRowHeight?: number;
    defaultRowHeight?: number;
    onUpdateRowHeight?: (rowHeight: number) => void;
  } = { previousRowHeight: 5, previousConfigRowHeight: CONFIG_ROW_HEIGHT }
) => {
  const storageValue =
    previousRowHeight && previousConfigRowHeight
      ? { ['discover:dataGridRowHeight']: { previousRowHeight, previousConfigRowHeight } }
      : {};
  const storage = createLocalStorageMock(storageValue);
  const initialProps: UseRowHeightProps = {
    type: RowHeightType.row,
    storage,
    consumer: 'discover',
    key: 'dataGridRowHeight',
    defaultRowHeight,
    configRowHeight,
    rowHeightState,
    onUpdateRowHeight,
  };
  let hook!: RenderHookResult<ReturnType<typeof useRowHeight>, UseRowHeightProps>;
  act(() => {
    hook = renderHook(useRowHeight, { initialProps });
  });
  return {
    storage,
    initialProps,
    hook,
  };
};

describe('useRowHeightsOptions', () => {
  it('should apply rowHeight from rowHeightState', () => {
    const {
      hook: { result },
    } = renderRowHeightHook({ rowHeightState: 2 });
    expect(result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(result.current.rowHeightLines).toEqual(2);
  });

  it('should apply rowHeight from local storage', () => {
    const {
      hook: { result },
    } = renderRowHeightHook();
    expect(result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(result.current.rowHeightLines).toEqual(5);
  });

  it('should apply rowHeight from configRowHeight', () => {
    const {
      hook: { result },
    } = renderRowHeightHook({
      previousRowHeight: undefined,
      previousConfigRowHeight: undefined,
    });
    expect(result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(result.current.rowHeightLines).toEqual(CONFIG_ROW_HEIGHT);
  });

  it('should apply rowHeight from configRowHeight instead of local storage value, since configRowHeight has been changed', () => {
    const {
      hook: { result },
    } = renderRowHeightHook({
      previousConfigRowHeight: 4,
    });
    expect(result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(result.current.rowHeightLines).toEqual(3);
  });

  it('should return onChangeRowHeight and onChangeRowHeightLines when onUpdateRowHeight is provided', () => {
    const {
      hook: { result },
    } = renderRowHeightHook({ onUpdateRowHeight: jest.fn() });
    expect(result.current.onChangeRowHeight).toBeDefined();
    expect(result.current.onChangeRowHeightLines).toBeDefined();
  });

  it('should return undefined for onChangeRowHeight and onChangeRowHeightLines when onUpdateRowHeight is not provided', () => {
    const {
      hook: { result },
    } = renderRowHeightHook();
    expect(result.current.onChangeRowHeight).toBeUndefined();
  });

  it('should update stored row height and call onUpdateRowHeight when onChangeRowHeight is called', () => {
    const onUpdateRowHeight = jest.fn();
    const {
      storage,
      hook: { result },
    } = renderRowHeightHook({ onUpdateRowHeight });
    act(() => {
      result.current.onChangeRowHeight?.(RowHeightMode.auto);
    });
    expect(storage.get('discover:dataGridRowHeight')).toEqual({
      previousRowHeight: -1,
      previousConfigRowHeight: CONFIG_ROW_HEIGHT,
    });
    expect(onUpdateRowHeight).toHaveBeenLastCalledWith(-1);
    act(() => {
      result.current.onChangeRowHeight?.(RowHeightMode.custom);
    });
    expect(storage.get('discover:dataGridRowHeight')).toEqual({
      previousRowHeight: CONFIG_ROW_HEIGHT,
      previousConfigRowHeight: CONFIG_ROW_HEIGHT,
    });
    expect(onUpdateRowHeight).toHaveBeenLastCalledWith(CONFIG_ROW_HEIGHT);
  });

  it('should update stored row height and call onUpdateRowHeight when onChangeRowHeightLines is called', () => {
    const onUpdateRowHeight = jest.fn();
    const {
      storage,
      hook: { result },
    } = renderRowHeightHook({ onUpdateRowHeight });
    act(() => {
      result.current.onChangeRowHeightLines?.(2, true);
    });
    expect(storage.get('discover:dataGridRowHeight')).toEqual({
      previousRowHeight: 2,
      previousConfigRowHeight: CONFIG_ROW_HEIGHT,
    });
    expect(onUpdateRowHeight).toHaveBeenLastCalledWith(2);
  });

  it('should convert provided rowHeightState to rowHeight and rowHeightLines', () => {
    const { hook, initialProps } = renderRowHeightHook({ rowHeightState: -1 });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.auto);
    expect(hook.result.current.rowHeightLines).toEqual(-1);
    hook.rerender({ ...initialProps, rowHeightState: 0 }); // after removing "single" from UI, we can get "0" from legacy state, so we cast it to "custom" with 1 line count,
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(hook.result.current.rowHeightLines).toEqual(1);
    hook.rerender({ ...initialProps, rowHeightState: 3 });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(hook.result.current.rowHeightLines).toEqual(3);
  });

  it('should use configRowHeight for lineCountInput when rowHeightState is below 1', () => {
    const {
      hook: { result },
    } = renderRowHeightHook({
      rowHeightState: -1,
      configRowHeight: 4,
    });
    expect(result.current.rowHeight).toEqual(RowHeightMode.auto);
    expect(result.current.rowHeightLines).toEqual(-1);
    expect(result.current.lineCountInput).toEqual(4);
  });

  it('should use defaultRowHeight for lineCountInput when rowHeightState and configRowHeight are below 1', () => {
    const {
      hook: { result },
    } = renderRowHeightHook({
      rowHeightState: -1,
      configRowHeight: -1,
      defaultRowHeight: 5,
    });
    expect(result.current.rowHeight).toEqual(RowHeightMode.auto);
    expect(result.current.rowHeightLines).toEqual(-1);
    expect(result.current.lineCountInput).toEqual(5);
  });

  it('should not update rowHeightState but update lineCountInput when newRowHeightLines is invalid', () => {
    const onUpdateRowHeight = jest.fn();
    const {
      hook: { result },
    } = renderRowHeightHook({ onUpdateRowHeight });
    act(() => {
      result.current.onChangeRowHeightLines?.(42, false);
    });
    expect(onUpdateRowHeight).not.toHaveBeenCalled();
    expect(result.current.lineCountInput).toEqual(42);
  });

  it('should set lineCountInput to undefined when newRowHeightLines is 0 and invalid', () => {
    const onUpdateRowHeight = jest.fn();
    const {
      hook: { result },
    } = renderRowHeightHook({ onUpdateRowHeight });
    act(() => {
      result.current.onChangeRowHeightLines?.(0, false);
    });
    expect(onUpdateRowHeight).not.toHaveBeenCalled();
    expect(result.current.lineCountInput).toBeUndefined();
  });

  it('should reset invalid lineCountInput to last valid rowHeightLines when switching from custom to auto', () => {
    let rowHeightState = -1;
    const { hook, initialProps } = renderRowHeightHook({
      rowHeightState,
      onUpdateRowHeight: (newRowHeight) => {
        rowHeightState = newRowHeight;
      },
    });
    act(() => {
      hook.result.current.onChangeRowHeightLines?.(10, true);
      hook.rerender({ ...initialProps, rowHeightState });
    });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(hook.result.current.rowHeightLines).toEqual(10);
    expect(hook.result.current.lineCountInput).toEqual(10);
    act(() => {
      hook.result.current.onChangeRowHeightLines?.(42, false);
      hook.rerender({ ...initialProps, rowHeightState });
    });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(hook.result.current.rowHeightLines).toEqual(10);
    expect(hook.result.current.lineCountInput).toEqual(42);
    act(() => {
      hook.result.current.onChangeRowHeight?.(RowHeightMode.auto);
      hook.rerender({ ...initialProps, rowHeightState });
    });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.auto);
    expect(hook.result.current.rowHeightLines).toEqual(-1);
    expect(hook.result.current.lineCountInput).toEqual(10);
  });

  it('should update rowHeightLines to last lineCountInput when switching from auto to custom', () => {
    let rowHeightState = 10;
    const { hook, initialProps } = renderRowHeightHook({
      rowHeightState,
      onUpdateRowHeight: (newRowHeight) => {
        rowHeightState = newRowHeight;
      },
    });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(hook.result.current.rowHeightLines).toEqual(10);
    expect(hook.result.current.lineCountInput).toEqual(10);
    act(() => {
      hook.result.current.onChangeRowHeight?.(RowHeightMode.auto);
      hook.rerender({ ...initialProps, rowHeightState });
    });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.auto);
    expect(hook.result.current.rowHeightLines).toEqual(-1);
    expect(hook.result.current.lineCountInput).toEqual(10);
    act(() => {
      hook.result.current.onChangeRowHeight?.(RowHeightMode.custom);
      hook.rerender({ ...initialProps, rowHeightState });
    });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(hook.result.current.rowHeightLines).toEqual(10);
    expect(hook.result.current.lineCountInput).toEqual(10);
  });

  it('should sync lineCountInput with rowHeightLines when rowHeightState changes by consumer in custom mode', () => {
    let rowHeightState = 10;
    const { hook, initialProps } = renderRowHeightHook({
      rowHeightState,
      onUpdateRowHeight: (newRowHeight) => {
        rowHeightState = newRowHeight;
      },
    });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(hook.result.current.rowHeightLines).toEqual(10);
    expect(hook.result.current.lineCountInput).toEqual(10);
    act(() => {
      hook.rerender({ ...initialProps, rowHeightState: 15 });
    });
    expect(hook.result.current.rowHeight).toEqual(RowHeightMode.custom);
    expect(hook.result.current.rowHeightLines).toEqual(15);
    expect(hook.result.current.lineCountInput).toEqual(15);
  });
});
