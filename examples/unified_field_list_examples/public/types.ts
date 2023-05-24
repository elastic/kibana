/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListExamplesPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListExamplesPluginStart {}

export interface AppPluginSetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}
