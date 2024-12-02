/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMutation } from '@tanstack/react-query';
import type { APIKeyCreationResponse } from '@kbn/search-api-keys-server/types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { APIRoutes } from '../types';

export const useCreateApiKey = ({
  onSuccess,
  onError,
}: {
  onSuccess(key: APIKeyCreationResponse): void;
  onError(err: XMLHttpRequest): void;
}) => {
  const { http } = useKibana().services;
  const { mutateAsync: createApiKey } = useMutation<APIKeyCreationResponse | undefined>({
    mutationFn: async () => {
      try {
        if (!http?.post) {
          throw new Error('HTTP service is unavailable');
        }

        return await http.post<APIKeyCreationResponse>(APIRoutes.API_KEYS);
      } catch (err) {
        onError(err);
      }
    },
    onSuccess: (receivedApiKey) => {
      if (receivedApiKey) {
        onSuccess(receivedApiKey);
      }
    },
  });

  return createApiKey;
};
