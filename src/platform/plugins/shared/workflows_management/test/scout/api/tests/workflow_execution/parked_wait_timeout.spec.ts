/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { spaceTest } from '../../fixtures';

/** Bound for the 10s deadline plus Task Manager claim delay. The wait itself is 2m. */
const TIMEOUT_BOUND_MS = 60_000;
/** Execution elapsed time must stay under this, which is still well short of the 2m wait. */
const MAX_ELAPSED_MS = 90_000;

const PARKED_WAIT_TIMEOUT_YAML = `
name: Scout parked wait timeout
enabled: true
description: A long wait must time out at the workflow deadline
triggers:
  - type: manual
settings:
  timeout: 10s
steps:
  - name: pause
    type: wait
    with:
      duration: 2m
`;

spaceTest.describe('Parked wait timeout', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.afterAll(async ({ apiServices }) => {
    await apiServices.workflowsApi.deleteAll();
  });

  spaceTest('times out a parked wait at the workflow deadline', async ({ apiServices }) => {
    const { workflowsApi } = apiServices;
    const workflow = await workflowsApi.create(PARKED_WAIT_TIMEOUT_YAML);
    const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});

    const timedOut = await workflowsApi.waitForStatus({
      workflowExecutionId,
      status: ExecutionStatus.TIMED_OUT,
      timeout: TIMEOUT_BOUND_MS,
    });

    const elapsedMs =
      new Date(timedOut.finishedAt).getTime() - new Date(timedOut.startedAt).getTime();
    expect(elapsedMs).toBeLessThan(MAX_ELAPSED_MS);
  });
});
