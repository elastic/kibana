/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest as base } from '@kbn/scout';
import { WorkflowsApiService } from './workflows_api_service';

interface WorkflowsWorkerFixtures {
  getWorkflowsApi: (roleApiCredentials: RoleApiCredentials) => Promise<WorkflowsApiService>;
}

export const apiTest = base.extend<{}, WorkflowsWorkerFixtures>({
  getWorkflowsApi: [
    async ({ apiClient }, use) => {
      await use(async (roleApiCredentials) => {
        return new WorkflowsApiService(apiClient, roleApiCredentials);
      });
    },
    { scope: 'worker' },
  ],
});
