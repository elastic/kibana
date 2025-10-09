/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useThunkDispatch } from './use_thunk_dispatch';
import { updateWorkflowThunk } from '../thunks/update_workflow_thunk';

export interface UseToggleWorkflowReturn {
  toggleWorkflow: (enabled: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useToggleWorkflow(): UseToggleWorkflowReturn {
  const dispatch = useThunkDispatch();
  const { id } = useParams<{ id?: string }>();
  const { notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWorkflow = useCallback(
    async (enabled: boolean) => {
      if (!id) {
        throw new Error('Workflow ID is required');
      }
      setIsLoading(true);
      setError(null);

      try {
        await dispatch(updateWorkflowThunk({ id, workflow: { enabled } }));

        // Invalidate relevant queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['workflows'] });
        queryClient.invalidateQueries({ queryKey: ['workflows', id] });
      } catch (err) {
        setError(err);
        notifications.toasts.addError(err, {
          toastLifeTimeMs: 3000,
          title: i18n.translate('workflows.detail.error.workflowToggleFailed', {
            defaultMessage: 'Failed to toggle workflow',
          }),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, id, queryClient, notifications?.toasts]
  );

  return { toggleWorkflow, isLoading, error };
}
