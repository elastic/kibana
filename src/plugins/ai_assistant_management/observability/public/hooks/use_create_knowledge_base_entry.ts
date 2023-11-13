/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// export function useCreateKnowledgeBaseEntry() {
// const getEntries = (): Promise<{ entries: KnowledgeBaseEntry[] }> => {
//     return service.callApi('GET /internal/observability_ai_assistant/kb/entries', {
//       signal: null,
//     });
//   };

//   const saveEntry = (params: { body: Foo }): Promise<void> => {
//     return service.callApi('POST /internal/observability_ai_assistant/kb/entries/save', {
//       signal: null,
//       params,
//     });
//   };

//   const deleteEntry = (entryId: string): Promise<void> => {
//     return service.callApi('DELETE /internal/observability_ai_assistant/kb/entries/{entryId}', {
//       signal: null,
//       params: {
//         path: { entryId },
//       },
//     });
//   };

// return {};
// }

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/app_context';
import { REACT_QUERY_KEYS } from '../constants';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useCreateKnowledgeBaseEntry() {
  const {
    http,
    notifications: { toasts },
  } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    ServerError,
    {
      entry: Omit<KnowledgeBaseEntry, '@timestamp'>;
    }
  >(
    [REACT_QUERY_KEYS.CREATE_KB_ENTRIES],
    ({ entry }) => {
      const body = JSON.stringify(entry);
      return http.post(`/internal/management/ai_assistant/observability/kb/entries/save`, { body });
    },
    {
      onSuccess: (_data, { entry }) => {
        toasts.addSuccess(
          i18n.translate(
            'aiAssistantManagementObservability.kb.addManualEntry.successNotification',
            {
              defaultMessage: 'Successfully created {name}',
              values: { name: entry.id },
            }
          )
        );

        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_KB_ENTRIES],
          refetchType: 'all',
        });
      },
      onError: (error, { entry }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'aiAssistantManagementObservability.kb.addManualEntry.errorNotification',
            {
              defaultMessage: 'Something went wrong while creating {name}',
              values: { name: entry.id },
            }
          ),
        });
      },
    }
  );
}
