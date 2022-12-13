/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { Action } from '../../actions';

export const partitionActions = (actions: Action[], showMoreActionsFrom: number) => {
  if (showMoreActionsFrom <= 1) return { extraActions: actions, visibleActions: [] };
  if (actions.length <= showMoreActionsFrom) return { extraActions: [], visibleActions: actions };

  return {
    visibleActions: actions.slice(0, showMoreActionsFrom - 1),
    extraActions: actions.slice(showMoreActionsFrom - 1, actions.length),
  };
};

export interface PartitionedActions {
  extraActions: Array<Action<object>>;
  visibleActions: Array<Action<object>>;
}

export const usePartitionActions = (
  getActions: () => Promise<Action[]>,
  showMoreActionsFrom: number
): PartitionedActions & { loading: boolean } => {
  const { value: allActions, loading } = useAsync(() => getActions(), []);

  return useMemo(() => {
    if (loading) {
      return { extraActions: [], visibleActions: [], loading };
    }
    return { ...partitionActions(allActions ?? [], showMoreActionsFrom), loading };
  }, [loading, allActions, showMoreActionsFrom]);
};
