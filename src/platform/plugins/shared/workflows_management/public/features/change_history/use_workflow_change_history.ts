/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type MutableRefObject, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ChangeHistoryAdapter, ChangeHistoryPendingChange } from '@kbn/change-history-ui';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';

import { createWorkflowChangeHistoryAdapter } from './workflow_change_history_adapter';
import type { AppDispatch } from '../../entities/workflows/store/store';
import { selectWorkflow } from '../../entities/workflows/store/workflow_detail/selectors';
import { loadWorkflowThunk } from '../../entities/workflows/store/workflow_detail/thunks/load_workflow_thunk';
import { useKibana } from '../../hooks/use_kibana';

export const useWorkflowChangeHistoryEnabled = (): boolean => {
  const { canReadWorkflow } = useWorkflowsCapabilities();

  return canReadWorkflow;
};

export interface UseWorkflowChangeHistoryAdapterResult {
  adapter: ChangeHistoryAdapter;
  pendingChangeRef: MutableRefObject<ChangeHistoryPendingChange | undefined>;
}

export const useWorkflowChangeHistoryAdapter = (
  workflowId: string
): UseWorkflowChangeHistoryAdapterResult => {
  const dispatch = useDispatch<AppDispatch>();
  const { http } = useKibana().services;
  const pendingChangeRef = useRef<ChangeHistoryPendingChange | undefined>();

  const onWorkflowRestored = useCallback(
    async (objectId: string) => {
      await dispatch(loadWorkflowThunk({ id: objectId || workflowId }));
    },
    [dispatch, workflowId]
  );

  const adapter = useMemo(
    () =>
      createWorkflowChangeHistoryAdapter(http, {
        onWorkflowRestored,
        getPendingChange: () => pendingChangeRef.current,
      }),
    [http, onWorkflowRestored]
  );

  return { adapter, pendingChangeRef };
};

export const useWorkflowChangeHistoryRestoreEligibility = (): boolean => {
  const { canUpdateWorkflow } = useWorkflowsCapabilities();
  const workflow = useSelector(selectWorkflow);

  if (!workflow) {
    return false;
  }

  return Boolean(canUpdateWorkflow && workflow.managed !== true);
};
