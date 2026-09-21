/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useColumns } from './use_data_grid_columns';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { configMock } from '../../__mocks__/config';
import { dataViewsMock } from '../../__mocks__/data_views';
import type { Capabilities } from '@kbn/core/types';

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

  test('should keep _source column when other columns exist', () => {
    const { result } = renderHook(() => {
      return useColumns({
        ...defaultProps,
        columns: ['Time', '_source'],
      });
    });

    expect(result.current.columns).toEqual(['Time', '_source']);
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

  describe('when actions are dispatched before the columns prop is updated', () => {
    const renderWithColumnsState = (initialColumns: string[]) => {
      const state = { columns: initialColumns };
      const rendered = renderHook(() =>
        useColumns({
          ...defaultProps,
          columns: state.columns,
          setAppState: ({ columns }) => {
            state.columns = columns;
          },
        })
      );

      return { state, ...rendered };
    };

    test('should keep every added column', () => {
      const { state, result } = renderWithColumnsState(['message']);

      act(() => {
        result.current.onAddColumn('agent.id');
        result.current.onAddColumn('agent.name');
      });

      expect(state.columns).toEqual(['message', 'agent.id', 'agent.name']);
    });

    test('should remove every removed column', () => {
      const { state, result } = renderWithColumnsState(['message', 'agent.id', 'agent.name']);

      act(() => {
        result.current.onRemoveColumn('agent.id');
        result.current.onRemoveColumn('agent.name');
      });

      expect(state.columns).toEqual(['message']);
    });
  });
});
