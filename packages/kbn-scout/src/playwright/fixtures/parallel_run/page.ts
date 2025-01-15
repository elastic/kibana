/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Page, test as base } from '@playwright/test';
import { KibanaUrl, ScoutPage, WorkerSpaceFixure } from '../types';
import { extendPlaywrightPage } from '../common/test_scope/page';

export const scoutSpacePageFixture = base.extend<
  {},
  { kbnUrl: KibanaUrl; workerSpace: WorkerSpaceFixure }
>({
  page: async (
    {
      page,
      kbnUrl,
      workerSpace,
    }: { page: Page; kbnUrl: KibanaUrl; workerSpace: WorkerSpaceFixure },
    use: (spaceAwarePage: ScoutPage) => Promise<void>
  ) => {
    const extendedPage = extendPlaywrightPage({ page, kbnUrl });

    // Overriding navigation to specific Kibana apps to take into account the worker space
    extendedPage.gotoApp = (appName: string) =>
      page.goto(kbnUrl.app(appName, { space: workerSpace.id }));
    // Method to wait for global loading indicator to be hidden
    await use(extendedPage);
  },
});
