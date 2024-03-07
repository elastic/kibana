/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useMutation } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { AIPlaygroundPluginStartDeps, ChatFormFields } from '../../types';

interface UseApiKeyQueryParams {
  name: string;
  expiresInDays: number;
}

export const useCreateApiKeyQuery = () => {
  const { services } = useKibana<AIPlaygroundPluginStartDeps>();
  const { getValues } = useFormContext();

  const { data, isError, isLoading, isSuccess, mutateAsync } = useMutation({
    mutationFn: async ({ name, expiresInDays }: UseApiKeyQueryParams) => {
      const response = await services.http.post<{
        apiKey: { encoded: string; name: string; expiration: number };
      }>('/internal/enterprise_search/ai_playground/api_key', {
        body: JSON.stringify({
          name,
          expiresInDays,
          indices: getValues(ChatFormFields.indices),
        }),
      });

      return response.apiKey.encoded;
    },
  });

  return {
    apiKey: data,
    isLoading,
    isSuccess,
    isError,
    action: mutateAsync,
  };
};
