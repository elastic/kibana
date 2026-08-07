/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { Template } from '@kbn/workflows-library';
import { type CatalogFilters, filterCatalog } from './filter_catalog';
import { useWorkflowsApi } from '../../api/use_workflows_api';

/**
 * Fetches the full Workflow Template Library catalog (cached across callers via
 * react-query) and applies {@link filterCatalog} client-side. At v1 scale
 * (dozens to low hundreds of templates) fetching once and filtering in-memory is
 * comfortable.
 *
 * @example
 * ```tsx
 * const { templates, isLoading, isError, refetch } = useCatalog({ search, categories });
 * ```
 */
export function useCatalog(filters?: CatalogFilters) {
  const api = useWorkflowsApi();

  const query = useQuery<Template[]>({
    queryKey: ['workflows-library', 'catalog'],
    queryFn: async () => {
      const { templates } = await api.getCatalog();
      return templates;
    },
    staleTime: 60_000,
  });

  const templates = useMemo(
    () => filterCatalog(query.data ?? [], filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.data, filters?.search, filters?.solution, filters?.categories?.join(',')]
  );

  return { ...query, templates, allTemplates: query.data ?? [] };
}
