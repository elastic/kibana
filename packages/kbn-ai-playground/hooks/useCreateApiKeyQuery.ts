/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AIPlaygroundPluginStartDeps } from '@kbn/ai-playground/types';
import { useMutation } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { ChatFormFields } from '../types';

interface UseApiKeyQueryParams {
  name: string;
  expiresInDays: number;
}

export const useCreateApiKeyQuery = () => {
  const { services } = useKibana<AIPlaygroundPluginStartDeps>();
  const { getValues } = useFormContext();

  const { data, isLoading, isSuccess, mutate } = useMutation({
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

  return { apiKey: data, isLoading, isCreated: isSuccess, action: mutate };
};
