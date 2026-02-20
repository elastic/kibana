/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutSpaceParallelFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker/scout_space';
import type { WorkflowsApiServicesFixture } from '.';

/**
 * Cleanup function to delete workflows and alert rules in a space.
 * Workflows are stored in ES indices (not saved objects) and must be deleted explicitly.
 * This prevents orphaned task manager tasks when the space is deleted.
 * See https://github.com/elastic/kibana/issues/139227
 */
export async function cleanupWorkflowsAndRules({
  scoutSpace,
  apiServices,
}: {
  scoutSpace: ScoutSpaceParallelFixture;
  apiServices: WorkflowsApiServicesFixture;
}) {
  await apiServices.workflows.deleteAll(scoutSpace.id);
  await apiServices.alerting.cleanup.deleteAllRules(scoutSpace.id);
  await scoutSpace.savedObjects.cleanStandardList();
}
