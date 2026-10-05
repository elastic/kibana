/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PageObjects,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { test as baseTest, spaceTest as baseSpaceTest } from '@kbn/scout';
import { DataViewEditorFlyoutPage, DataViewDetailPage } from './page_objects';

export interface DataViewManagementPageObjects extends PageObjects {
  dataViewEditorFlyout: DataViewEditorFlyoutPage;
  dataViewDetail: DataViewDetailPage;
}

export interface DataViewManagementTestFixtures extends ScoutTestFixtures {
  pageObjects: DataViewManagementPageObjects;
}

export const test = baseTest.extend<DataViewManagementTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: PageObjects; page: ScoutTestFixtures['page'] },
    use: (po: DataViewManagementPageObjects) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      dataViewEditorFlyout: new DataViewEditorFlyoutPage(page),
      dataViewDetail: new DataViewDetailPage(page),
    });
  },
});

interface DataViewManagementParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: PageObjects & {
    dataViewEditorFlyout: DataViewEditorFlyoutPage;
    dataViewDetail: DataViewDetailPage;
  };
}

export const spaceTest = baseSpaceTest.extend<
  DataViewManagementParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: DataViewManagementParallelTestFixtures['pageObjects'];
      page: DataViewManagementParallelTestFixtures['page'];
    },
    use: (po: DataViewManagementParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      dataViewEditorFlyout: new DataViewEditorFlyoutPage(page),
      dataViewDetail: new DataViewDetailPage(page),
    });
  },
});
