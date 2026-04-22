/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiServicesFixture, KbnClient, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { spaceTest as spaceBaseTest } from '@kbn/scout';
import type { ScoutSpaceParallelFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker';
import { WorkflowsApiService } from '../../../scout_workflows_ui/common/apis/workflows';

export type { WorkflowsApiService };

export interface WorkflowsApiServicesFixture extends ApiServicesFixture {
  workflowsApi: WorkflowsApiService;
}

interface WorkflowsWorkerFixtures extends ScoutParallelWorkerFixtures {
  apiServices: WorkflowsApiServicesFixture;
}

export const spaceTest = spaceBaseTest.extend<{}, WorkflowsWorkerFixtures>({
  apiServices: [
    async (
      {
        apiServices,
        kbnClient,
        scoutSpace,
      }: {
        apiServices: ApiServicesFixture;
        kbnClient: KbnClient;
        scoutSpace: ScoutSpaceParallelFixture;
      },
      use: (extendedApiServices: WorkflowsApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices: WorkflowsApiServicesFixture = {
        ...apiServices,
        workflowsApi: new WorkflowsApiService(scoutSpace.id, kbnClient),
      };
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});
