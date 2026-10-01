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
} from '@kbn/scout';
import { createLazyPageObject, spaceTest as spaceBaseTest } from '@kbn/scout';
import { DataViewFieldEditor } from './page_objects';

type DataViewManagementPageObjects = PageObjects & {
  dataViewFieldEditor: DataViewFieldEditor;
};

export interface DataViewManagementParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: DataViewManagementPageObjects;
}

export const spaceTest = spaceBaseTest.extend<
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
    use: (pageObjects: DataViewManagementParallelTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      dataViewFieldEditor: createLazyPageObject(DataViewFieldEditor, page),
    });
  },
});
