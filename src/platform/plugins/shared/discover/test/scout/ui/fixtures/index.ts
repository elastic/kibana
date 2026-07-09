/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutParallelTestFixtures } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { DocViewer } from '@kbn/unified-doc-viewer/test/scout/ui/fixtures/page_objects';
import type { DiscoverWorkerFixtures } from './common';
import { spaceTest as spaceBaseTest } from './common';

export interface DiscoverPageObjects extends PageObjects {
  docViewer: DocViewer;
}

export interface DiscoverTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: DiscoverPageObjects;
}

export const spaceTest = spaceBaseTest.extend<DiscoverTestFixtures, DiscoverWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: DiscoverTestFixtures['pageObjects'];
      page: DiscoverTestFixtures['page'];
    },
    use: (pageObjects: DiscoverTestFixtures['pageObjects']) => Promise<void>
  ) => {
    await use({
      ...pageObjects,
      docViewer: createLazyPageObject(DocViewer, page),
    });
  },
});
