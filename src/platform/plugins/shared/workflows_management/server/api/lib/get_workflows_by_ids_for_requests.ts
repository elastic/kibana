/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowAccessControlService } from '../../services/workflow_access_control';

export interface GetWorkflowsByIdsForRequestsDeps {
  /** Reads the workflows of one space by id (see `getWorkflowsByIds` in `services/get_workflows_by_ids`). */
  getWorkflowsByIds: (ids: string[], spaceId: string) => Promise<WorkflowDetailDto[]>;
  getAccessControl: () => Promise<Pick<WorkflowAccessControlService, 'toDto'>>;
}

/**
 * Looks up workflows for several requests at once: one read per space, then each request only
 * sees the workflows it is allowed to read.
 */
export async function getWorkflowsByIdsForRequests(
  deps: GetWorkflowsByIdsForRequestsDeps,
  lookups: Array<{ ids: string[]; spaceId: string; request: KibanaRequest }>
): Promise<Array<PromiseSettledResult<WorkflowDetailDto[]>>> {
  const idsBySpace = new Map<string, Set<string>>();
  for (const { ids, spaceId } of lookups) {
    const uniqueIds = idsBySpace.get(spaceId) ?? new Set<string>();
    ids.forEach((id) => uniqueIds.add(id));
    idsBySpace.set(spaceId, uniqueIds);
  }
  const access = await deps.getAccessControl();
  const documentsBySpace = new Map(
    [...idsBySpace].map(([spaceId, ids]) => [spaceId, deps.getWorkflowsByIds([...ids], spaceId)])
  );
  return Promise.allSettled(
    lookups.map(async ({ ids, spaceId, request }) => {
      const documents = await documentsBySpace.get(spaceId);
      const requestedIds = new Set(ids);
      const results = await Promise.all(
        (documents ?? [])
          .filter(({ id }) => requestedIds.has(id))
          .map((workflow) => access.toDto(workflow, request))
      );
      return results.filter((workflow) => workflow.permissions.read);
    })
  );
}
