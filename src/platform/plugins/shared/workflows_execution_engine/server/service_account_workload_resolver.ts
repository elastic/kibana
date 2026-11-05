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
 * Resolves workflows bound to service accounts: whether each still exists, and for a live one its
 * name and the path of its page. The management page shows the name and the link. The stale
 * binding cleanup deletes the binding of a workflow reported `missing`. Reads with internal access,
 * so it also names workflows the person looking cannot open.
 */
export const resolveWorkflowWorkloads = async (
  repository: Pick<WorkflowRepository, 'getWorkflowStatuses'>,
  workloads: ReadonlyArray<ServiceAccountWorkloadLocator>,
  { signal }: { signal: AbortSignal }
): Promise<ServiceAccountWorkloadDetails[]> => {
  const statuses = await repository.getWorkflowStatuses(
    workloads.map(({ workloadId, spaceId }) => ({ workflowId: workloadId, spaceId })),
    { signal }
  );

  return workloads.map(({ workloadId, spaceId }): ServiceAccountWorkloadDetails => {
    const workflow = statuses.get(`${spaceId}:${workloadId}`);
    if (workflow === undefined) {
      return { status: 'unknown' };
    }
    if (workflow.status !== 'present' || workflow.name === undefined) {
      return { status: workflow.status };
    }
    return {
      status: 'present',
      title: workflow.name,
      path: `/app/${WORKFLOWS_APP_ID}/${encodeURIComponent(workloadId)}`,
    };
  });
};
