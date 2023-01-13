/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { makeAction } from '../mocks/helpers';
import { CellActionExecutionContext } from './cell_actions';
import {
  CellActionsContextProvider,
  useLoadActions,
  useLoadActionsFn,
} from './cell_actions_context';

describe('CellActionsContextProvider', () => {
  const actionContext = { trigger: { id: 'triggerId' } } as CellActionExecutionContext;

  it('loads actions when useLoadActionsFn callback is called', async () => {
    const action = makeAction('action-1', 'icon', 1);
    const getActionsPromise = Promise.resolve([action]);
    const getActions = () => getActionsPromise;

    const { result } = renderHook(
      () => useLoadActionsFn(),

      {
        wrapper: ({ children }) => (
          <CellActionsContextProvider getTriggerCompatibleActions={getActions}>
            {children}
          </CellActionsContextProvider>
        ),
      }
    );

    const [{ value: valueBeforeFnCalled }, loadActions] = result.current;

    // value is undefined before loadActions is called
    expect(valueBeforeFnCalled).toBeUndefined();

    await act(async () => {
      loadActions(actionContext);
      await getActionsPromise;
    });

    const [{ value: valueAfterFnCalled }] = result.current;

    expect(valueAfterFnCalled).toEqual([action]);
  });

  it('loads actions when useLoadActions called', async () => {
    const action = makeAction('action-1', 'icon', 1);
    const getActionsPromise = Promise.resolve([action]);
    const getActions = () => getActionsPromise;

    const { result } = renderHook(
      () => useLoadActions(actionContext),

      {
        wrapper: ({ children }) => (
          <CellActionsContextProvider getTriggerCompatibleActions={getActions}>
            {children}
          </CellActionsContextProvider>
        ),
      }
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(result.current.value).toEqual([action]);
  });

  it('sorts actions by order', async () => {
    const firstAction = makeAction('action-1', 'icon', 1);
    const secondAction = makeAction('action-2', 'icon', 2);
    const getActionsPromise = Promise.resolve([secondAction, firstAction]);
    const getActions = () => getActionsPromise;

    const { result } = renderHook(
      () => useLoadActions(actionContext),

      {
        wrapper: ({ children }) => (
          <CellActionsContextProvider getTriggerCompatibleActions={getActions}>
            {children}
          </CellActionsContextProvider>
        ),
      }
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(result.current.value).toEqual([firstAction, secondAction]);
  });

  it('sorts actions by id when order is undefined', async () => {
    const firstAction = makeAction('action-1');
    const secondAction = makeAction('action-2');

    const getActionsPromise = Promise.resolve([secondAction, firstAction]);
    const getActions = () => getActionsPromise;

    const { result } = renderHook(
      () => useLoadActions(actionContext),

      {
        wrapper: ({ children }) => (
          <CellActionsContextProvider getTriggerCompatibleActions={getActions}>
            {children}
          </CellActionsContextProvider>
        ),
      }
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(result.current.value).toEqual([firstAction, secondAction]);
  });

  it('sorts actions by id and order', async () => {
    const actionWithoutOrder = makeAction('action-1-no-order');
    const secondAction = makeAction('action-2', 'icon', 2);
    const thirdAction = makeAction('action-3', 'icon', 3);

    const getActionsPromise = Promise.resolve([secondAction, actionWithoutOrder, thirdAction]);
    const getActions = () => getActionsPromise;

    const { result } = renderHook(
      () => useLoadActions(actionContext),

      {
        wrapper: ({ children }) => (
          <CellActionsContextProvider getTriggerCompatibleActions={getActions}>
            {children}
          </CellActionsContextProvider>
        ),
      }
    );

    await act(async () => {
      await getActionsPromise;
    });

    expect(result.current.value).toEqual([secondAction, thirdAction, actionWithoutOrder]);
  });
});
