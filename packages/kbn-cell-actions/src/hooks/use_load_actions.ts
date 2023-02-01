/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
export const useLoadActions = (context: CellActionCompatibilityContext): AsyncActions => {
  const { getActions } = useCellActionsContext();
  const { error, ...actionsState } = useAsync(() => getActions(context), []);
  useThrowError(error);
  return actionsState;
};

/**
 * Returns a function to perform the getActions async call
 */
export const useLoadActionsFn = (): [AsyncActions, GetActions] => {
  const { getActions } = useCellActionsContext();
  const [{ error, ...actionsState }, loadActions] = useAsyncFn(getActions, []);
  useThrowError(error);
  return [actionsState, loadActions];
};

/**
 * Groups getActions calls for an array of contexts in one async bulk operation
 */
export const useBulkLoadActions = (
  contexts: CellActionCompatibilityContext[]
): AsyncActions<CellAction[][]> => {
  const { getActions } = useCellActionsContext();
  const { error, ...actionsState } = useAsync(
    () => Promise.all(contexts.map((context) => getActions(context))),
    []
  );
  useThrowError(error);
  return actionsState;
};
