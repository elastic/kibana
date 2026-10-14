/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { TemplateBody } from '@kbn/workflows-library';
import { useWorkflowsApi } from '../../api/use_workflows_api';

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
  });
}
