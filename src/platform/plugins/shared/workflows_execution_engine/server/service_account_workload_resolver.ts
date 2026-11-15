/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ServiceAccountWorkloadDetails,
  ServiceAccountWorkloadLocator,
} from '@kbn/core-security-server';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { WorkflowRepository } from '@kbn/workflows';

/**
 * Resolves workflows bound to service accounts to their name and the path of their page, for the
 * service account management page. Reads with internal access, so it also names workflows the
 * person looking cannot open.
 */
export const resolveWorkflowWorkloads = async (
  repository: Pick<WorkflowRepository, 'getWorkflowNames'>,
  workloads: ReadonlyArray<ServiceAccountWorkloadLocator>,
  { signal }: { signal: AbortSignal }
): Promise<Array<ServiceAccountWorkloadDetails | undefined>> => {
  const names = await repository.getWorkflowNames(
    workloads.map(({ workloadId, spaceId }) => ({ workflowId: workloadId, spaceId })),
    { signal }
  );

  return workloads.map(({ workloadId, spaceId }) => {
    const title = names.get(`${spaceId}:${workloadId}`);
    return title === undefined
      ? undefined
      : { title, path: `/app/${WORKFLOWS_APP_ID}/${encodeURIComponent(workloadId)}` };
  });
};
