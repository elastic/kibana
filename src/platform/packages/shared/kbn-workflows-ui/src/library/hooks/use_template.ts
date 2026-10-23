/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import type { TemplateBody } from '@kbn/workflows-library';
import { useWorkflowsApi } from '../../api/use_workflows_api';

export const MAX_RETRIES = 3;

/** Whether a `useTemplate` error means the slug doesn't exist in the catalog. */
export const isTemplateNotFoundError = (error: unknown): boolean =>
  isHttpFetchError(error) && error.response?.status === 404;

/**
 * Fetches a single Workflow Template Library template body (parsed metadata +
 * workflow body + raw YAML) by slug. Used by the template detail page.
 */
export function useTemplate(slug: string | undefined) {
  const api = useWorkflowsApi();

  return useQuery<TemplateBody>({
    queryKey: ['workflows-library', 'template', slug],
    queryFn: () => api.getTemplate(slug as string),
    enabled: Boolean(slug),
    // An unknown slug won't appear on retry, so fail fast instead of backing off.
    retry: (failureCount, error) => !isTemplateNotFoundError(error) && failureCount < MAX_RETRIES,
  });
}
