/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient } from '@kbn/scout';
import type { ApiServicesFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker/apis';
import type { ScoutSpaceParallelFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker/scout_space';

/**
 * Cleanup function to delete workflows and alert rules in a space.
 * Workflows are stored in ES indices (not saved objects) and must be deleted explicitly.
 * This prevents orphaned task manager tasks when the space is deleted.
 * See https://github.com/elastic/kibana/issues/139227
 */
export async function cleanupWorkflowsAndRules({
  scoutSpace,
  apiServices,
  kbnClient,
}: {
  scoutSpace: ScoutSpaceParallelFixture;
  apiServices: ApiServicesFixture;
  kbnClient: KbnClient;
}) {
  // Delete all workflows in the space (stored in ES, not saved objects)
  const workflowsResponse = await kbnClient.request<{ results?: Array<{ id: string }> }>({
    method: 'POST',
    path: `/s/${scoutSpace.id}/api/workflows/search`,
    body: { size: 10000, page: 1 },
  });

  const workflowIds = workflowsResponse.data.results?.map((w) => w.id) || [];
  if (workflowIds.length > 0) {
    await kbnClient.request({
      method: 'DELETE',
      path: `/s/${scoutSpace.id}/api/workflows`,
      body: { ids: workflowIds },
    });
  }

  // Delete all alert rules in the space
  await apiServices.alerting.cleanup.deleteAllRules(scoutSpace.id);

  // Clean up standard saved objects
  await scoutSpace.savedObjects.cleanStandardList();
}
