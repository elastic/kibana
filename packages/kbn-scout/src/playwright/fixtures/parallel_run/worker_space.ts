/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@playwright/test';
import { KbnClient, ToolingLog, WorkerSpaceFixure } from '../types';

export const workerSpaceFixure = base.extend<
  {},
  { log: ToolingLog; kbnClient: KbnClient; workerSpace: WorkerSpaceFixure }
>({
  workerSpace: [
    async ({ log, kbnClient }: { log: ToolingLog; kbnClient: KbnClient }, use, workerInfo) => {
      const id = `test-space-${workerInfo.workerIndex}`;
      const spacePayload = {
        id,
        name: id,
        disabledFeatures: [],
      };
      log.debug(`Creating space ${id}`);
      await kbnClient.spaces.create(spacePayload);

      await use(spacePayload);

      // Cleanup space after tests via API call
      log.debug(`Deleting space ${id}`);
      await kbnClient.spaces.delete(id);
    },
    { scope: 'worker' },
  ],
});
