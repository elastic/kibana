/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { createLocalStorageMock } from '../../__mocks__/local_storage_mock';
import { useRowHeight } from './use_row_height';
import { RowHeightMode } from '../components/row_height_settings';

const CONFIG_ROW_HEIGHT = 3;

const renderRowHeightHook = (
  {
    previousRowHeight,
    previousConfigRowHeight,
    rowHeightState,
    onUpdateRowHeight,
  }: {
    previousRowHeight?: number;
    previousConfigRowHeight?: number;
    rowHeightState?: number;
    onUpdateRowHeight?: (rowHeight: number) => void;
  } = { previousRowHeight: 5, previousConfigRowHeight: CONFIG_ROW_HEIGHT }
) => {
  const storageValue =
    previousRowHeight && previousConfigRowHeight
      ? { ['discover:dataGridRowHeight']: { previousRowHeight, previousConfigRowHeight } }
      : {};
  const storage = createLocalStorageMock(storageValue);
  const initialProps = {
    storage,
    consumer: 'discover',
    key: 'dataGridRowHeight',
    configRowHeight: CONFIG_ROW_HEIGHT,
    rowHeightState,
    onUpdateRowHeight,
  };

  return {
    storage,
    initialProps,
    hook: renderHook(useRowHeight, { initialProps }),
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
    result.current.onChangeRowHeight?.(RowHeightMode.auto);
    expect(storage.get('discover:dataGridRowHeight')).toEqual({
      previousRowHeight: -1,
      previousConfigRowHeight: CONFIG_ROW_HEIGHT,
    });
    expect(onUpdateRowHeight).toHaveBeenLastCalledWith(-1);
    result.current.onChangeRowHeight?.(RowHeightMode.custom);
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
    result.current.onChangeRowHeightLines?.(2);
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
});
