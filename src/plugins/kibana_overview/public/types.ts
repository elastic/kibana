/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { NewsfeedPublicPluginStart } from '@kbn/newsfeed-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';

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
  dataViews: DataViewsPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  newsfeed?: NewsfeedPublicPluginStart;
  share: SharePluginStart;
}
