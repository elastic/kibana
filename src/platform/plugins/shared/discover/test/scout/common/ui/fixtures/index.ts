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
  ScoutPage,
  ScoutParallelWorkerFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { createLazyPageObject, test as baseTest } from '@kbn/scout';
import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';
import { UnifiedFieldList } from '@kbn/unified-field-list/test/scout/ui/fixtures/page_objects';
import { DocViewer } from '@kbn/unified-doc-viewer/test/scout/ui/fixtures/page_objects';
import { spaceTest as spaceBaseTest } from './common';

export type DiscoverPageObjects = PageObjects & {
  inspector: Inspector;
  unifiedFieldList: UnifiedFieldList;
  docViewer: DocViewer;
};

export interface DiscoverTestFixtures {
  pageObjects: DiscoverPageObjects;
}

const extendWithDiscoverPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): DiscoverPageObjects => ({
  ...pageObjects,
  inspector: createLazyPageObject(Inspector, page),
  unifiedFieldList: createLazyPageObject(UnifiedFieldList, page),
  docViewer: createLazyPageObject(DocViewer, page),
});

export const spaceTest = spaceBaseTest.extend<DiscoverTestFixtures, ScoutParallelWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendWithDiscoverPageObjects(pageObjects, page));
  },
});

/**
 * Default-space (single-worker) variant used by the sequential Discover UI suite.
 * Exposes the same page objects as `spaceTest` but runs in the default space
 */
export const test = baseTest.extend<DiscoverTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    await use(extendWithDiscoverPageObjects(pageObjects, page));
  },
});
