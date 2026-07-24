/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelTestFixtures, ScoutTestFixtures } from '@kbn/scout';
import { createLazyPageObject, spaceTest as spaceBaseTest, test as baseTest } from '@kbn/scout';
import { Inspector } from '@kbn/inspector-plugin/test/scout/ui/fixtures/page_objects';
import { DataViewEditorPage } from '@kbn/data-view-editor-plugin/test/scout/ui/fixtures/page_objects';
import { VisualizeEditor, VisualizeChart } from './page_objects';

// `inspector` (owned by the inspector plugin) and `dataViewEditor` (owned by the
// data_view_editor plugin) are reused from their owning plugins; `visEditor` /
// `visChart` are Visualize-specific and live in this plugin. Everything else comes
// from core `@kbn/scout`. Extending the base tests locally avoids registering these
// on the shared core `PageObjects` type.
export type VisualizeParallelPageObjects = ScoutParallelTestFixtures['pageObjects'] & {
  inspector: Inspector;
  visEditor: VisualizeEditor;
  visChart: VisualizeChart;
};

export interface VisualizeParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: VisualizeParallelPageObjects;
}

export const spaceTest = spaceBaseTest.extend<VisualizeParallelTestFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: VisualizeParallelPageObjects = {
      ...pageObjects,
      inspector: createLazyPageObject(Inspector, page),
      visEditor: createLazyPageObject(VisualizeEditor, page),
      visChart: createLazyPageObject(VisualizeChart, page),
    };

    await use(extendedPageObjects);
  },
});

// The sequential (`tests/`) suite reuses the data view editor flyout page object.
export type VisualizeSequentialPageObjects = ScoutTestFixtures['pageObjects'] & {
  dataViewEditor: DataViewEditorPage;
};

export interface VisualizeSequentialTestFixtures extends ScoutTestFixtures {
  pageObjects: VisualizeSequentialPageObjects;
}

export const test = baseTest.extend<VisualizeSequentialTestFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects: VisualizeSequentialPageObjects = {
      ...pageObjects,
      dataViewEditor: createLazyPageObject(DataViewEditorPage, page),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from './constants';
export {
  loadVisualizeSuiteDefaults,
  cleanupVisualizeSuiteDefaults,
  deleteIndicesByPattern,
} from './helpers';
