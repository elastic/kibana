/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { unwrapResult } from '@reduxjs/toolkit';
import { useKibana } from '../../../../../hooks/use_kibana';
import { testWorkflowThunk } from '../thunks/test_workflow_thunk';
import { useThunkDispatch } from './use_thunk_dispatch';

export interface UseTestWorkflowReturn {
  testWorkflow: (inputs: Record<string, any>) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export function useTestWorkflow(): UseTestWorkflowReturn {
  const dispatch = useThunkDispatch();
  const { notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testWorkflow = useCallback(
    async (inputs: Record<string, any>): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await dispatch(testWorkflowThunk({ inputs }));

        // Invalidate relevant queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['workflows'] });

        // Show success notification
        notifications.toasts.addSuccess(
          i18n.translate('workflows.detail.success.workflowTestStarted', {
            defaultMessage: 'Workflow test execution started',
          })
        );

        const payload = unwrapResult(result);
        return payload.workflowExecutionId;
      } catch (err) {
        setError(err);
        notifications.toasts.addError(err, {
          toastLifeTimeMs: 3000,
          title: i18n.translate('workflows.detail.error.workflowTestFailed', {
            defaultMessage: 'Failed to test workflow',
          }),
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, queryClient, notifications?.toasts]
  );

  return { testWorkflow, isLoading, error };
}
