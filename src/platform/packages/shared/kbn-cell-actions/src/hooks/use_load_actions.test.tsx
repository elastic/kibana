/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { waitFor, renderHook, act, screen } from '@testing-library/react';
import { makeAction, makeActionContext } from '../mocks/helpers';
import { useBulkLoadActions, useLoadActions, useLoadActionsFn } from './use_load_actions';

const action = makeAction('action-1', 'icon', 1);
const mockGetActions = jest.fn();
jest.mock('../context/cell_actions_context', () => ({
  useCellActionsContext: () => ({ getActions: mockGetActions }),
}));

class ErrorCatcher extends React.Component<React.PropsWithChildren> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    return this.state.error ? (
      <div data-test-subj="leaf-error">{this.state.error.toString()}</div>
    ) : (
      this.props.children
    );
  }
}

describe('loadActions hooks', () => {
  const actionContext = makeActionContext();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActions.mockResolvedValue([action]);
  });
  describe('useLoadActions', () => {
    it('should load actions when called', async () => {
      const { result } = renderHook(useLoadActions, {
        initialProps: actionContext,
      });

      expect(result.current.value).toBeUndefined();
      expect(result.current.loading).toEqual(true);
      expect(mockGetActions).toHaveBeenCalledTimes(1);
      expect(mockGetActions).toHaveBeenCalledWith(actionContext);

      await waitFor(() => {
        expect(result.current.value).toEqual([action]);
        expect(result.current.loading).toEqual(false);
      });
    });

    it('should throw error when getAction is rejected', async () => {
      const message = 'some division by 0';
      mockGetActions.mockRejectedValueOnce(Error(message));

      const { result } = renderHook(useLoadActions, {
        initialProps: actionContext,
        wrapper: ErrorCatcher, // Error prints any received error to the screen
      });

      expect(result.current.loading).toEqual(true);

      await waitFor(() => expect(screen.getByTestId('leaf-error')).toBeInTheDocument());
    });

    it('filters out disabled actions', async () => {
      const actionEnabled = makeAction('action-enabled');
      const actionDisabled = makeAction('action-disabled');
      mockGetActions.mockResolvedValue([actionEnabled, actionDisabled]);

      const { result } = renderHook(() =>
        useLoadActions(actionContext, { disabledActionTypes: [actionDisabled.type] })
      );

      await waitFor(() => expect(result.current.value).toEqual([actionEnabled]));
    });
  });

  describe('useLoadActionsFn', () => {
    it('should load actions when returned function is called', async () => {
      const { result } = renderHook(useLoadActionsFn);
      const [{ value: valueBeforeCall, loading: loadingBeforeCall }, loadActions] = result.current;

      expect(valueBeforeCall).toBeUndefined();
      expect(loadingBeforeCall).toEqual(false);
      expect(mockGetActions).not.toHaveBeenCalled();

      act(() => {
        loadActions(actionContext);
      });

      const [{ value: valueAfterCall, loading: loadingAfterCall }] = result.current;
      expect(valueAfterCall).toBeUndefined();
      expect(loadingAfterCall).toEqual(true);
      expect(mockGetActions).toHaveBeenCalledTimes(1);
      expect(mockGetActions).toHaveBeenCalledWith(actionContext);

      await waitFor(() => {
        const [{ value: valueAfterUpdate, loading: loadingAfterUpdate }] = result.current;
        expect(valueAfterUpdate).toEqual([action]);
        expect(loadingAfterUpdate).toEqual(false);
      });
    });

    it('should throw error when getAction is rejected', async () => {
      const message = 'some division by 0';
      mockGetActions.mockRejectedValueOnce(new Error(message));

      const { result } = renderHook(useLoadActionsFn, {
        wrapper: ErrorCatcher, // Error prints any received error to the screen
      });
      const [_, loadActions] = result.current;

      act(() => {
        loadActions(actionContext);
      });

      await waitFor(() => expect(screen.getByTestId('leaf-error')).toBeInTheDocument());
    });

    it('filters out disabled actions types', async () => {
      const actionEnabled = makeAction('action-enabled');
      const actionDisabled = makeAction('action-disabled');
      mockGetActions.mockResolvedValue([actionEnabled, actionDisabled]);

      const { result } = renderHook(() =>
        useLoadActionsFn({ disabledActionTypes: [actionDisabled.type] })
      );
      const [_, loadActions] = result.current;

      act(() => {
        loadActions(actionContext);
      });
      await waitFor(() => {
        const [{ value: valueAfterUpdate }] = result.current;
        expect(valueAfterUpdate).toEqual([actionEnabled]);
      });
    });
  });

  describe('useBulkLoadActions', () => {
    const actionContext2 = makeActionContext({ trigger: { id: 'triggerId2' } });
    const actionContexts = [actionContext, actionContext2];

    it('should load bulk actions array when called', async () => {
      const { result } = renderHook(useBulkLoadActions, {
        initialProps: actionContexts,
      });

      expect(result.current.value).toBeUndefined();
      expect(result.current.loading).toEqual(true);
      expect(mockGetActions).toHaveBeenCalledTimes(2);
      expect(mockGetActions).toHaveBeenCalledWith(actionContext);
      expect(mockGetActions).toHaveBeenCalledWith(actionContext2);

      await waitFor(() => {
        expect(result.current.value).toEqual([[action], [action]]);
        expect(result.current.loading).toEqual(false);
      });
    });

    it('should throw error when getAction is rejected', async () => {
      const message = 'some division by 0';
      mockGetActions.mockRejectedValueOnce(Error(message));

      const { result } = renderHook(useBulkLoadActions, {
        initialProps: actionContexts,
        wrapper: ErrorCatcher, // Error prints any received error to the screen
      });

      expect(result.current.loading).toEqual(true);

      await waitFor(() => expect(screen.getByTestId('leaf-error')).toBeInTheDocument());
    });

    it('filters out disabled actions types', async () => {
      const actionEnabled = makeAction('action-enabled');
      const actionDisabled = makeAction('action-disabled');
      mockGetActions.mockResolvedValue([actionEnabled, actionDisabled]);

      const { result } = renderHook(() =>
        useBulkLoadActions(actionContexts, { disabledActionTypes: [actionDisabled.type] })
      );

      await waitFor(() => expect(result.current.value).toEqual([[actionEnabled], [actionEnabled]]));
    });

    it('should re-render when contexts is changed', async () => {
      const { result, rerender } = renderHook(useBulkLoadActions, {
        initialProps: [actionContext],
      });

      await waitFor(() => expect(mockGetActions).toHaveBeenCalledWith(actionContext));

      rerender([actionContext2]);
      await waitFor(() => expect(mockGetActions).toHaveBeenCalledWith(actionContext2));

      mockGetActions.mockClear();

      rerender([]);
      await waitFor(() => {
        expect(mockGetActions).toHaveBeenCalledTimes(0);

        expect(result.current.value).toBeInstanceOf(Array);
        expect(result.current.value).toHaveLength(0);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should return the same array after re-render when contexts is undefined', async () => {
      const { result, rerender } = renderHook(useBulkLoadActions, {
        initialProps: undefined,
      });

      await waitFor(() => expect(result.current.value).toEqual([]));
      expect(result.current.loading).toBe(false);
      expect(mockGetActions).not.toHaveBeenCalled();

      const initialResultValue = result.current.value;

      rerender(undefined);

      await waitFor(() => expect(result.current.value).toEqual([]));
      expect(result.current.value).toBe(initialResultValue);
      expect(result.current.loading).toBe(false);
      expect(mockGetActions).not.toHaveBeenCalled();
    });
  });
});
