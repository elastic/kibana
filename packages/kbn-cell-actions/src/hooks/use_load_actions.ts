/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import useAsyncFn, { type AsyncState } from 'react-use/lib/useAsyncFn';
import { useCellActionsContext } from '../context/cell_actions_context';
import type { CellAction, CellActionCompatibilityContext, GetActions } from '../types';

type AsyncActions<V = CellAction[]> = Omit<AsyncState<V>, 'error'>;

const useThrowError = (error?: Error) => {
  if (error) {
    throw error;
  }
};

/**
 * Performs the getActions async call and returns its value
 */
export const useLoadActions = (
  context: CellActionCompatibilityContext,
  options: LoadActionsOptions = {}
): AsyncActions => {
  const { getActions } = useCellActionsContext();
  const { error, value, loading } = useAsync(() => getActions(context), []);
  const filteredActions = useFilteredActions(value, options.disabledActions);
  useThrowError(error);
  return { value: filteredActions, loading };
};

/**
 * Returns a function to perform the getActions async call
 */
export const useLoadActionsFn = (options: LoadActionsOptions = {}): [AsyncActions, GetActions] => {
  const { getActions } = useCellActionsContext();
  const [{ error, value, loading }, loadActions] = useAsyncFn(getActions, []);
  const filteredActions = useFilteredActions(value, options.disabledActions);
  useThrowError(error);
  return [{ value: filteredActions, loading }, loadActions];
};

interface LoadActionsOptions {
  disabledActions?: string[];
}

/**
 * Groups getActions calls for an array of contexts in one async bulk operation
 */
export const useBulkLoadActions = (
  contexts: CellActionCompatibilityContext[],
  options: LoadActionsOptions = {}
): AsyncActions<CellAction[][]> => {
  const { getActions } = useCellActionsContext();
  const { error, ...actionsState } = useAsync(
    () =>
      Promise.all(
        contexts.map((context) =>
          getActions(context).then(
            (actions) => filteredActions(actions, options.disabledActions) ?? []
          )
        )
      ),
    []
  );
  useThrowError(error);
  return actionsState;
};

const useFilteredActions = (actions: CellAction[] | undefined, disabledActions?: string[]) =>
  useMemo(() => filteredActions(actions, disabledActions), [actions, disabledActions]);

const filteredActions = (actions: CellAction[] | undefined, disabledActions: string[] = []) =>
  actions ? actions.filter(({ id }) => !disabledActions?.includes(id)) : undefined;
