/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { renderHook } from '@testing-library/react';
import { getStoredDataGridDensity, useDataGridDensity } from './use_data_grid_density';
import { DATA_GRID_STYLE_EXPANDED, DataGridDensity } from '../constants';

const localStorageMock = {
  get: jest.fn(),
  set: jest.fn(),
};

describe('useDataGridDensity', () => {
  beforeEach(() => {
    localStorageMock.get.mockClear();
    localStorageMock.set.mockClear();
  });

  it('should default to compact density', () => {
    localStorageMock.get.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useDataGridDensity({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
      })
    );
    const {
      current: { dataGridDensity },
    } = result;
    expect(dataGridDensity).toBe(DataGridDensity.COMPACT);
  });

  it('should read from local storage', () => {
    localStorageMock.get.mockReturnValue(DataGridDensity.NORMAL);
    const { result } = renderHook(() =>
      useDataGridDensity({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
      })
    );
    const {
      current: { dataGridDensity },
    } = result;
    expect(dataGridDensity).toBe(DataGridDensity.NORMAL);
  });

  it('should update local storage when onChangeDataGridDensity is called', () => {
    const { result } = renderHook(() =>
      useDataGridDensity({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
      })
    );
    const {
      current: { onChangeDataGridDensity },
    } = result;

    onChangeDataGridDensity(DATA_GRID_STYLE_EXPANDED);

    expect(localStorageMock.set).toBeCalledWith(
      'discover:dataGridDensity',
      DataGridDensity.EXPANDED
    );
  });

  it('should call provided onUpdateDataGridDensity with the updated value', () => {
    const onUpdateDataGridDensity = jest.fn();
    const { result } = renderHook(() =>
      useDataGridDensity({
        storage: localStorageMock as unknown as Storage,
        consumer: 'discover',
        onUpdateDataGridDensity,
      })
    );
    const {
      current: { onChangeDataGridDensity },
    } = result;

    onChangeDataGridDensity(DATA_GRID_STYLE_EXPANDED);

    expect(onUpdateDataGridDensity).toBeCalledWith(DataGridDensity.EXPANDED);
  });
});

describe('getStoredDataGridDensity', () => {
  const storage = localStorageMock as unknown as Storage;

  beforeEach(() => localStorageMock.get.mockReset());

  it('returns the stored density', () => {
    localStorageMock.get.mockReturnValue(DataGridDensity.EXPANDED);
    expect(getStoredDataGridDensity(storage, 'discover')).toBe(DataGridDensity.EXPANDED);
  });

  it('returns undefined when nothing is stored', () => {
    localStorageMock.get.mockReturnValue(undefined);
    expect(getStoredDataGridDensity(storage, 'discover')).toBeUndefined();
  });

  it('returns undefined for an invalid stored value', () => {
    localStorageMock.get.mockReturnValue('nonsense');
    expect(getStoredDataGridDensity(storage, 'discover')).toBeUndefined();
  });
});
