/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@kbn/scout';
import type { KibanaUrl, ScoutPage, ScoutWorkerFixtures, ScoutTestFixtures } from '@kbn/scout';
import type { ShareExtendedPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

interface PageObjectsDeps {
  pageObjects: ShareExtendedPageObjects;
  page: ScoutPage;
  kbnUrl: KibanaUrl;
}
type UseFn = (pageObjects: ShareExtendedPageObjects) => Promise<void>;

export interface ShareTestFixtures extends ScoutTestFixtures {
  pageObjects: ShareExtendedPageObjects;
}
export const test = base.extend<ShareTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page, kbnUrl }: PageObjectsDeps, use: UseFn) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page, kbnUrl);
    await use(extendedPageObjects);
  },
});
