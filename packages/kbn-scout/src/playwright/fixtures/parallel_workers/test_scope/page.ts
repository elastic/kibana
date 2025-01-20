/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Page, test as base } from '@playwright/test';
import { ScoutPage, extendPlaywrightPage } from '../../common/test_scope/page';
import { KibanaUrl } from '../../common';
import { KbnSpaceFixture } from '../worker_scope';

export type ScoutPageSpaceFixture = ScoutPage;

export const scoutPageSpaceFixture = base.extend<
  {},
  { kbnUrl: KibanaUrl; kbnSpace: KbnSpaceFixture }
>({
  page: async (
    { page, kbnUrl, kbnSpace }: { page: Page; kbnUrl: KibanaUrl; kbnSpace: KbnSpaceFixture },
    use: (spaceAwarePage: ScoutPage) => Promise<void>
  ) => {
    const extendedPage = extendPlaywrightPage({ page, kbnUrl });

    // Overriding navigation to specific Kibana apps to take into account the worker space
    extendedPage.gotoApp = (appName: string) =>
      page.goto(kbnUrl.app(appName, { space: kbnSpace.id }));
    // Method to wait for global loading indicator to be hidden
    await use(extendedPage);
  },
});
