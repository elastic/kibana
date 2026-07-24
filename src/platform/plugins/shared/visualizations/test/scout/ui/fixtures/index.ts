/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelTestFixtures } from '@kbn/scout';
import { createLazyPageObject, spaceTest as spaceBaseTest } from '@kbn/scout';
import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';

// The `inspector` page object is owned by the inspector plugin (the same one Discover
// reuses); the rest (visualize, visEditor, visChart, filterBar, dashboard, discover)
// come from core `@kbn/scout`. Extending `spaceTest` locally avoids registering a
// second, conflicting `inspector` on the shared core `PageObjects` type.
export type VisualizePageObjects = ScoutParallelTestFixtures['pageObjects'] & {
  inspector: Inspector;
};

export interface VisualizeTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: VisualizePageObjects;
}

export const spaceTest = spaceBaseTest.extend<VisualizeTestFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: VisualizePageObjects = {
      ...pageObjects,
      inspector: createLazyPageObject(Inspector, page),
    };

    await use(extendedPageObjects);
  },
});

// The sequential (`tests/`) suite only relies on core page objects.
export { test } from '@kbn/scout';

export * as testData from './constants';
export {
  loadVisualizeSuiteDefaults,
  cleanupVisualizeSuiteDefaults,
  deleteIndicesByPattern,
} from './helpers';
