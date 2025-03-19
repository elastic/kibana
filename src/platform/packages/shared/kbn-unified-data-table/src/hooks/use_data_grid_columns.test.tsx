/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useColumns } from './use_data_grid_columns';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { configMock } from '../../__mocks__/config';
import { dataViewsMock } from '../../__mocks__/data_views';
import { Capabilities } from '@kbn/core/types';

describe('useColumns', () => {
  const defaultProps = {
    capabilities: { discover_v2: { save: true } } as unknown as Capabilities,
    config: configMock,
    dataView: dataViewMock,
    dataViews: dataViewsMock,
    setAppState: () => {},
    columns: ['Time', 'message'],
  };

  test('should return valid result', () => {
    const { result } = renderHook(() => {
      return useColumns(defaultProps);
    });

    expect(result.current.columns).toEqual(['Time', 'message']);
    expect(result.current.onAddColumn).toBeInstanceOf(Function);
    expect(result.current.onRemoveColumn).toBeInstanceOf(Function);
    expect(result.current.onMoveColumn).toBeInstanceOf(Function);
    expect(result.current.onSetColumns).toBeInstanceOf(Function);
  });

  test('should skip _source column', () => {
    const { result } = renderHook(() => {
      return useColumns({
        ...defaultProps,
        columns: ['Time', '_source'],
      });
    });

    expect(result.current.columns).toEqual(['Time']);
  });

  test('should return empty columns array', () => {
    const { result } = renderHook(() => {
      return useColumns({
        ...defaultProps,
        columns: [],
      });
    });
    expect(result.current.columns).toEqual([]);
  });
});
