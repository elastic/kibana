/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { WorkflowsApiService } from '../../../common/apis/workflows';
import { waitForConditionOrThrow } from '../../../common/utils/wait_for_condition';

const TASK_MANAGER_INDEX = '.kibana_task_manager';
// The schedule fires every minute; allow two ticks plus Task Manager polling.
const TASK_REMOVAL_TIMEOUT_MS = 150_000;
const TEST_TIMEOUT_MS = TASK_REMOVAL_TIMEOUT_MS + 90_000;

const SCHEDULED_WORKFLOW_YAML = `
name: Scout scheduled workflow in a deleted space
enabled: true
triggers:
  - type: scheduled
    with:
      every: 1m
steps:
  - name: log_step
    type: console
    with:
      message: "Scheduled execution"
`;

apiTest.describe('Scheduled workflows in a deleted space', { tag: tags.stateful.classic }, () => {
  apiTest.setTimeout(TEST_TIMEOUT_MS);

  apiTest(
    'the next tick removes the scheduled task of a workflow whose space was deleted',
    async ({ kbnClient, esClient }) => {
      const spaceId = `workflows-space-deletion-${randomUUID()}`;
      const workflowsApi = new WorkflowsApiService(spaceId, kbnClient);
      const createSpace = () =>
        kbnClient.spaces.create({ id: spaceId, name: spaceId, disabledFeatures: [] });

      await createSpace();
      const workflow = await workflowsApi.create(SCHEDULED_WORKFLOW_YAML);
      const taskDocumentId = `task:workflow:${workflow.id}:scheduled`;
      const taskExists = () => esClient.exists({ index: TASK_MANAGER_INDEX, id: taskDocumentId });

      try {
        expect(await taskExists()).toBe(true);

        await kbnClient.spaces.delete(spaceId);

        await waitForConditionOrThrow({
          action: taskExists,
          condition: (exists) => !exists,
          interval: 5000,
          timeout: TASK_REMOVAL_TIMEOUT_MS,
          errorMessage: `Scheduled task ${taskDocumentId} still exists after its space was deleted`,
        });
      } finally {
        // Recreating the space makes any leftover workflow reachable so it can be removed.
        await createSpace().catch(() => undefined);
        await workflowsApi.deleteAll();
        await kbnClient.spaces.delete(spaceId);
      }
    }
  );
});
