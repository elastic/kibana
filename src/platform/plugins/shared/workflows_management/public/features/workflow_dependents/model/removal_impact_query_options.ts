/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { INTERNAL_API_VERSION } from '../../../../common/lib/api_constants';
import { WORKFLOW_REMOVAL_IMPACT_ROUTE } from '../../../../common/lib/workflow_dependents/api';
import type {
  WorkflowRemovalImpactRequestBody,
  WorkflowRemovalImpactResponse,
} from '../../../../common/lib/workflow_dependents/api';

/** Query for the workflows that fail when `workflowIds` are turned off or deleted. */
export const removalImpactQueryOptions = (http: HttpStart, workflowIds: string[]) => ({
  queryKey: ['workflows', 'removalImpact', [...workflowIds].sort()],
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    http.post<WorkflowRemovalImpactResponse>(WORKFLOW_REMOVAL_IMPACT_ROUTE, {
      version: INTERNAL_API_VERSION,
      body: JSON.stringify({ ids: workflowIds } satisfies WorkflowRemovalImpactRequestBody),
      signal,
    }),
  retry: false,
});
