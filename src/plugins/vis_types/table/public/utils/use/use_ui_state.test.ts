/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { TableVisUiState } from '../../types';
import { useUiState } from './use_ui_state';

describe('useUiState', () => {
  let uiState: PersistedState;

  beforeEach(() => {
    uiState = {
      get: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      set: jest.fn(),
    } as any;
  });

  it("should init default columnsWidth & sort if uiState doesn't have it set", () => {
    const { result } = renderHook(() => useUiState(uiState));

    expect(result.current).toEqual({
      columnsWidth: [],
      sort: {
        columnIndex: null,
        direction: null,
      },
      setColumnsWidth: expect.any(Function),
      setSort: expect.any(Function),
    });
  });

  it('should subscribe on uiState changes and update local state', async () => {
    const { result, unmount, waitForNextUpdate } = renderHook(() => useUiState(uiState));

    expect(uiState.on).toHaveBeenCalledWith('change', expect.any(Function));
    // @ts-expect-error
    const updateOnChange = uiState.on.mock.calls[0][1];

    uiState.getChanges = jest.fn(() => ({
      vis: {
        params: {
          sort: {
            columnIndex: 1,
            direction: 'asc',
          },
          colWidth: [],
        },
      },
    }));

    act(() => {
      updateOnChange();
    });

    await waitForNextUpdate();

    // should update local state with new values
    expect(result.current).toEqual({
      columnsWidth: [],
      sort: {
        columnIndex: 1,
        direction: 'asc',
      },
      setColumnsWidth: expect.any(Function),
      setSort: expect.any(Function),
    });

    act(() => {
      updateOnChange();
    });

    // should skip setting the state again if it is equal
    expect(result.current).toEqual({
      columnsWidth: [],
      sort: {
        columnIndex: 1,
        direction: 'asc',
      },
      setColumnsWidth: expect.any(Function),
      setSort: expect.any(Function),
    });

    unmount();

    expect(uiState.off).toHaveBeenCalledWith('change', updateOnChange);
  });

  describe('updating uiState through callbacks', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    it('should update the uiState with new sort', async () => {
      const { result } = renderHook(() => useUiState(uiState));
      const newSort: TableVisUiState['sort'] = {
        columnIndex: 5,
        direction: 'desc',
      };

      act(() => {
        result.current.setSort(newSort);
      });

      expect(result.current.sort).toEqual(newSort);

      jest.runAllTimers();

      expect(uiState.set).toHaveBeenCalledTimes(1);
      expect(uiState.set).toHaveBeenCalledWith('vis.params.sort', newSort);
    });

    it('should update the uiState with new columns width', async () => {
      const { result } = renderHook(() => useUiState(uiState));
      const col1 = { colIndex: 0, width: 300 };
      const col2 = { colIndex: 1, width: 100 };

      // set width of a column
      act(() => {
        result.current.setColumnsWidth(col1);
      });

      expect(result.current.columnsWidth).toEqual([col1]);

      jest.runAllTimers();

      expect(uiState.set).toHaveBeenCalledTimes(1);
      expect(uiState.set).toHaveBeenLastCalledWith('vis.params.colWidth', [col1]);

      // set width of another column
      act(() => {
        result.current.setColumnsWidth(col2);
      });

      jest.runAllTimers();

      expect(uiState.set).toHaveBeenCalledTimes(2);
      expect(uiState.set).toHaveBeenLastCalledWith('vis.params.colWidth', [col1, col2]);

      const updatedCol1 = { colIndex: 0, width: 200 };
      // update width of existing column
      act(() => {
        result.current.setColumnsWidth(updatedCol1);
      });

      jest.runAllTimers();

      expect(uiState.set).toHaveBeenCalledTimes(3);
      expect(uiState.set).toHaveBeenCalledWith('vis.params.colWidth', [updatedCol1, col2]);
    });

    afterAll(() => {
      jest.useRealTimers();
    });
  });
});
