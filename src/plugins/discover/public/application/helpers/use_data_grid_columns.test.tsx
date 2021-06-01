/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useDataGridColumns } from './use_data_grid_columns';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { configMock } from '../../__mocks__/config';
import { indexPatternsMock } from '../../__mocks__/index_patterns';
import { AppState } from '../angular/context_state';
import { Capabilities } from '../../../../../core/types';

describe('useDataGridColumns', () => {
  const defaultProps = {
    capabilities: ({ discover: { save: true } } as unknown) as Capabilities,
    config: configMock,
    indexPattern: indexPatternMock,
    indexPatterns: indexPatternsMock,
    setAppState: () => {},
    state: {
      columns: ['Time', 'message'],
    } as AppState,
    useNewFieldsApi: false,
  };

  test('should return valid result', () => {
    const { result } = renderHook(() => {
      return useDataGridColumns(defaultProps);
    });

    expect(result.current.columns).toEqual(['Time', 'message']);
    expect(result.current.onAddColumn).toBeInstanceOf(Function);
    expect(result.current.onRemoveColumn).toBeInstanceOf(Function);
    expect(result.current.onMoveColumn).toBeInstanceOf(Function);
    expect(result.current.onSetColumns).toBeInstanceOf(Function);
  });

  test('should skip _source column when useNewFieldsApi is set to true', () => {
    const { result } = renderHook(() => {
      return useDataGridColumns({
        ...defaultProps,
        state: {
          columns: ['Time', '_source'],
        },
        useNewFieldsApi: true,
      });
    });

    expect(result.current.columns).toEqual(['Time']);
  });

  test('should return empty columns array', () => {
    const { result } = renderHook(() => {
      return useDataGridColumns({
        ...defaultProps,
        state: {
          columns: [],
        },
      });
    });
    expect(result.current.columns).toEqual([]);
  });
});
