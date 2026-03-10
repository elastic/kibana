/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base, spaceTest as spaceBaseTest } from '@kbn/scout';
import type {
  ApiServicesFixture,
  KbnClient,
  ScoutPage,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';

import type { WorkflowsApiService } from './apis/workflows';
import { getWorkflowsApiService } from './apis/workflows';
import type { WorkflowsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface WorkflowsApiServicesFixture extends ApiServicesFixture {
  workflows: WorkflowsApiService;
}

export interface WorkflowsTestFixtures extends ScoutTestFixtures {
  pageObjects: WorkflowsPageObjects;
}

export interface WorkflowsWorkerFixtures extends ScoutParallelWorkerFixtures {
  apiServices: WorkflowsApiServicesFixture;
}

export const test = base.extend<WorkflowsTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: WorkflowsPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: WorkflowsPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});

export const spaceTest = spaceBaseTest.extend<WorkflowsTestFixtures, WorkflowsWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: WorkflowsPageObjects; page: ScoutPage },
    use: (pageObjects: WorkflowsPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
  apiServices: [
    async (
      { apiServices, kbnClient }: { apiServices: ApiServicesFixture; kbnClient: KbnClient },
      use: (extendedApiServices: WorkflowsApiServicesFixture) => Promise<void>
    ) => {
      const extendedApiServices = apiServices as WorkflowsApiServicesFixture;
      extendedApiServices.workflows = getWorkflowsApiService(kbnClient);
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});
