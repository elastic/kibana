/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { PartitionedActions, CellAction } from '../types';

export const partitionActions = (actions: CellAction[], visibleCellActions: number) => {
  if (visibleCellActions <= 1) return { extraActions: actions, visibleActions: [] };
  if (actions.length <= visibleCellActions) return { extraActions: [], visibleActions: actions };

  return {
    visibleActions: actions.slice(0, visibleCellActions - 1),
    extraActions: actions.slice(visibleCellActions - 1, actions.length),
  };
};

export const usePartitionActions = (
  allActions: CellAction[],
  visibleCellActions: number
): PartitionedActions => {
  return useMemo(() => {
    return partitionActions(allActions ?? [], visibleCellActions);
  }, [allActions, visibleCellActions]);
};
