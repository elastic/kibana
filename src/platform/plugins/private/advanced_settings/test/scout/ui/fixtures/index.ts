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

import type { AdvancedSettingsPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export interface AdvancedSettingsTestFixtures extends ScoutTestFixtures {
  pageObjects: AdvancedSettingsPageObjects;
}

export const test = base.extend<AdvancedSettingsTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: AdvancedSettingsPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: AdvancedSettingsPageObjects) => Promise<void>
  ) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
