/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useThunkDispatch } from './use_thunk_dispatch';
import { useKibana } from '../../../../../hooks/use_kibana';
import { saveYamlThunk } from '../thunks/save_yaml_thunk';

export interface UseSaveYamlReturn {
  saveYaml: () => Promise<{ success: boolean }>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveYaml(): UseSaveYamlReturn {
  const dispatch = useThunkDispatch();
  const { id } = useParams<{ id?: string }>();
  const { notifications } = useKibana().services;
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveYaml = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await dispatch(saveYamlThunk({ id }));

      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id] });

      // Skip save success notifications for now
      return { success: true };
    } catch (err) {
      setError(err);
      notifications.toasts.addError(err, {
        toastLifeTimeMs: 3000,
        title: i18n.translate('workflows.detail.error.workflowSaveFailed', {
          defaultMessage: 'Failed to save workflow',
        }),
      });
    } finally {
      setIsLoading(false);
    }
    return { success: false };
  }, [dispatch, id, queryClient, notifications?.toasts]);

  return { saveYaml, isLoading, error };
}
