/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useAsync from 'react-use/lib/useAsync';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useCellActionsContext } from '../context/cell_actions_context';
import { CellActionExecutionContext } from '../types';

/**
 * Performs the getActions async call and returns its value
 */
export const useLoadActions = (context: CellActionExecutionContext) => {
  const { getActions } = useCellActionsContext();
  return useAsync(() => getActions(context), []);
};

/**
 * Returns a function to perform the getActions async call
 */
export const useLoadActionsFn = () => {
  const { getActions } = useCellActionsContext();
  return useAsyncFn(getActions, []);
};

/**
 * Groups getActions calls for an array of contexts in one async bulk operation
 */
export const useBulkLoadActions = (contexts: CellActionExecutionContext[]) => {
  const { getActions } = useCellActionsContext();
  return useAsync(() => Promise.all(contexts.map((context) => getActions(context))), []);
};
