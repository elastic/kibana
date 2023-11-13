/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/app_context';
import { REACT_QUERY_KEYS } from '../constants';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useDeleteKnowledgeBaseEntry() {
  const {
    http,
    notifications: { toasts },
  } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation<void, ServerError, { id: string }>(
    [REACT_QUERY_KEYS.CREATE_KB_ENTRIES],
    ({ id }) => {
      return http.delete(`/internal/management/ai_assistant/observability/kb/entries/${id}`);
    },
    {
      onSuccess: (_data, { id }) => {
        toasts.addSuccess(
          i18n.translate(
            'aiAssistantManagementObservability.kb.deleteManualEntry.successNotification',
            {
              defaultMessage: 'Successfully deleted {id}',
              values: { id },
            }
          )
        );

        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_KB_ENTRIES],
          refetchType: 'all',
        });
      },
      onError: (error, { id }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'aiAssistantManagementObservability.kb.deleteManualEntry.errorNotification',
            {
              defaultMessage: 'Something went wrong while deleting {name}',
              values: { name: id },
            }
          ),
        });
      },
    }
  );
}
