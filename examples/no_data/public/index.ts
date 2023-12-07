/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { NoDataPagePluginSetup } from '@kbn/no-data-page-plugin/public';
import { NoDataExamplesPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new NoDataExamplesPlugin();
}
export type { NoDataExamplesPluginSetup, NoDataExamplesPluginStart } from './types';

export interface NoDataExamplesPluginSetupDeps {
  developerExamples: DeveloperExamplesSetup;
  noDataPage: NoDataPagePluginSetup;
}
