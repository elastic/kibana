/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { UnifiedSearchPublicPluginStart } from '../../../src/plugins/unified_search/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';
import { SharePluginSetup } from '../../../src/plugins/share/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchExamplesPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchExamplesPluginStart {}

export interface AppPluginSetupDependencies {
  developerExamples: DeveloperExamplesSetup;
  share: SharePluginSetup;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}
