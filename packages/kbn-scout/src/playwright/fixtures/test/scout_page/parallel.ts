/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Page, test as base } from '@playwright/test';
import { PathOptions } from '../../../../common/services/kibana_url';
import { ScoutPage } from '.';
import { KibanaUrl, ScoutLogger } from '../../worker';
import { ScoutSpaceParallelFixture } from '../../worker/scout_space';
import { extendPlaywrightPage } from './single_thread';

export const scoutPageParallelFixture = base.extend<
  { page: ScoutPage },
  { log: ScoutLogger; kbnUrl: KibanaUrl; scoutSpace: ScoutSpaceParallelFixture }
>({
  page: async (
    {
      log,
      page,
      kbnUrl,
      scoutSpace,
    }: { log: ScoutLogger; page: Page; kbnUrl: KibanaUrl; scoutSpace: ScoutSpaceParallelFixture },
    use: (extendedPage: ScoutPage) => Promise<void>
  ) => {
    const extendedPage = extendPlaywrightPage({ page, kbnUrl });

    // Overriding navigation to specific Kibana apps: url should respect the Kibana Space id
    extendedPage.gotoApp = (appName: string, pathOptions?: PathOptions) =>
      page.goto(kbnUrl.app(appName, { space: scoutSpace.id, pathOptions }));

    log.serviceLoaded(`scoutPage:${scoutSpace.id}`);
    await use(extendedPage);
  },
});
