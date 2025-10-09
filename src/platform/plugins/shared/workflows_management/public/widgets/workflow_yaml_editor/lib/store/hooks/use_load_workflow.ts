/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../hooks/use_kibana';
import { loadWorkflowThunk } from '../thunks/load_workflow_thunk';

export interface UseLoadWorkflowReturn {
  loadWorkflow: (id: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function useLoadWorkflow(): UseLoadWorkflowReturn {
  const { notifications } = useKibana().services;
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflow = useCallback(
    (id: string) => {
      setIsLoading(true);
      setError(null);
      try {
        dispatch(loadWorkflowThunk({ id }));
      } catch (err) {
        setError(err);
        notifications.toasts.addError(err, {
          toastLifeTimeMs: 3000,
          title: i18n.translate('workflows.detail.error.workflowLoadFailed', {
            defaultMessage: 'Failed to load workflow',
          }),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, notifications.toasts]
  );

  return { loadWorkflow, isLoading, error };
}
