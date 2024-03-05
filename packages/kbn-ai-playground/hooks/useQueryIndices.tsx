/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexName } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AIPlaygroundPluginStartDeps, ElasticsearchIndex } from '../types';

export const useQueryIndices = (
  query: string = ''
): { indices: IndexName[]; isLoading: boolean } => {
  const { services } = useKibana<AIPlaygroundPluginStartDeps>();

  const { data, isLoading } = useQuery({
    queryKey: ['indices', query],
    queryFn: async () => {
      const response = await services.http.get<{
        indices: ElasticsearchIndex[];
      }>('/internal/enterprise_search/indices', {
        query: {
          from: 0,
          only_show_search_optimized_indices: false,
          return_hidden_indices: false,
          search_query: query,
          size: 20,
        },
      });

      return response.indices.map((index) => index.name);
    },
  });

  return { indices: data || [], isLoading };
};
