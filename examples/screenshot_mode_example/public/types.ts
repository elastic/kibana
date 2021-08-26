/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
import { ScreenshotModePluginSetup } from '../../../src/plugins/screenshot_mode/public';
import { UsageCollectionSetup } from '../../../src/plugins/usage_collection/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';

export interface AppPluginSetupDependencies {
  usageCollection: UsageCollectionSetup;
  screenshotMode: ScreenshotModePluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
