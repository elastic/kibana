/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest, createLazyPageObject } from '@kbn/scout';
import { FilesManagementPage } from './page_objects';

export interface FilesManagementTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    filesManagement: FilesManagementPage;
  };
}

export const test = baseTest.extend<FilesManagementTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: FilesManagementTestFixtures['pageObjects'];
      page: FilesManagementTestFixtures['page'];
    },
    use: (pageObjects: FilesManagementTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      filesManagement: createLazyPageObject(FilesManagementPage, page),
    });
  },
});

export * as testData from './constants';
