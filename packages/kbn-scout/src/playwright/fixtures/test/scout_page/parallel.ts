/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Page, test as base } from '@playwright/test';
import { ScoutPage } from '.';
import { KibanaUrl, ToolingLog } from '../../worker';
import { ScoutSpaceParallelFixture } from '../../worker/scout_space';
import { extendPlaywrightPage } from './single_thread';
import { serviceLoadedMsg } from '../../../utils';

export const scoutPageParallelFixture = base.extend<
  { page: ScoutPage },
  { log: ToolingLog; kbnUrl: KibanaUrl; scoutSpace: ScoutSpaceParallelFixture }
>({
  page: async (
    {
      log,
      page,
      kbnUrl,
      scoutSpace,
    }: { log: ToolingLog; page: Page; kbnUrl: KibanaUrl; scoutSpace: ScoutSpaceParallelFixture },
    use: (extendedPage: ScoutPage) => Promise<void>
  ) => {
    const extendedPage = extendPlaywrightPage({ page, kbnUrl });

    // Overriding navigation to specific Kibana apps: url should respect the Kibana Space id
    extendedPage.gotoApp = (appName: string) =>
      page.goto(kbnUrl.app(appName, { space: scoutSpace.id }));

    log.debug(serviceLoadedMsg(`scoutPage:${scoutSpace.id}`));
    await use(extendedPage);
  },
});
