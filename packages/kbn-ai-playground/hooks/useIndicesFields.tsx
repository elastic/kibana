/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AIPlaygroundPluginStartDeps, IndicesQuerySourceFields } from '../types';

export const useIndicesFields = (indices: string[]) => {
  const { services } = useKibana<AIPlaygroundPluginStartDeps>();

  const { data, isLoading } = useQuery({
    enabled: indices.length > 0,
    queryKey: ['fields', indices.toString()],
    initialData: {},
    queryFn: async () => {
      const response = await services.http.post<IndicesQuerySourceFields>(
        '/internal/enterprise_search/ai_playground/query_source_fields',
        {
          body: JSON.stringify({
            indices,
          }),
        }
      );

      return response;
    },
  });

  return { fields: data!, isLoading };
};
