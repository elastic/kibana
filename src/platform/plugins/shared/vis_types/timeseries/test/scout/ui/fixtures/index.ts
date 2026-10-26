/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, ScoutParallelTestFixtures, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { spaceTest as baseSpaceTest } from '@kbn/scout';
import type { TimeseriesPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

export * as testData from './constants';
export * from './chart_debug';
export * from './helpers';

export interface TimeseriesParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: TimeseriesPageObjects;
}

export const spaceTest = baseSpaceTest.extend<
  TimeseriesParallelTestFixtures,
  ScoutParallelWorkerFixtures
>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: TimeseriesPageObjects;
      page: ScoutPage;
    },
    use: (pageObjects: TimeseriesPageObjects) => Promise<void>
  ) => {
    await use(extendPageObjects(pageObjects, page));
  },
});
