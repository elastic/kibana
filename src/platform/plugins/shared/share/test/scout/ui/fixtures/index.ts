/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@kbn/scout';
import type { KibanaUrl, ScoutPage, PageObjects, ScoutWorkerFixtures } from '@kbn/scout';

import type { SharePluginPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface ShareExtendedPageObjects extends PageObjects {
  pageObjects: SharePluginPageObjects;
}

export const test = base.extend<ShareExtendedPageObjects, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: SharePluginPageObjects;
      page: ScoutPage;
      kbnUrl: KibanaUrl;
    },
    use: (pageObjects: SharePluginPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page, kbnUrl);
    await use(extendedPageObjects);
  },
});
