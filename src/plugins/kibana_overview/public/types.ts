/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HomePublicPluginSetup, HomePublicPluginStart } from 'src/plugins/home/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { NewsfeedPublicPluginStart } from 'src/plugins/newsfeed/public';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KibanaOverviewPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KibanaOverviewPluginStart {}

export interface AppPluginSetupDependencies {
  home: HomePublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface AppPluginStartDependencies {
  home: HomePublicPluginStart;
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  newsfeed?: NewsfeedPublicPluginStart;
}
