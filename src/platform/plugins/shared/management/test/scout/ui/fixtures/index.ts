/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base } from '@kbn/scout';
import type { ScoutPage, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { ManagementPage } from './page_objects/management_page';

interface ManagementFixtures extends ScoutTestFixtures {
  pageObjects: ScoutTestFixtures['pageObjects'] & {
    management: ManagementPage;
  };
}

export const test = base.extend<ManagementFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: ScoutTestFixtures['pageObjects']; page: ScoutPage },
    use
  ) => {
    await use({
      ...pageObjects,
      management: new ManagementPage(page),
    } as ManagementFixtures['pageObjects']);
  },
});

export { CUSTOM_ROLES } from './custom_roles';
