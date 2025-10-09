/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RunWorkflowCommand, RunWorkflowResponseDto } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../hooks/use_kibana';

export function useRunWorkflow() {
  const { id } = useParams<{ id?: string }>();
  const { notifications, http } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<RunWorkflowResponseDto, Error, RunWorkflowCommand>({
    mutationKey: ['POST', 'workflows', 'id', 'run'],
    mutationFn: ({ inputs }) =>
      http.post(`/api/workflows/${id}/run`, {
        body: JSON.stringify({ inputs }),
      }),
    onSuccess: () => {
      notifications.toasts.addSuccess(
        i18n.translate('workflows.actions.run.success', {
          defaultMessage: 'Workflow execution started',
        }),
        { toastLifeTimeMs: 3000 }
      );
    },
    onError: (err) => {
      notifications.toasts.addError(err, {
        toastLifeTimeMs: 3000,
        title: i18n.translate('workflows.actions.run.error', {
          defaultMessage: 'Failed to run workflow',
        }),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id, 'executions'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id] });
    },
  });
}
