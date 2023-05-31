/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { NavigationKibanaProvider, NavigationProvider } from './src/services';

export { DefaultNavigation, Navigation, getPresets } from './src/ui';

export type {
  NavigationTreeDefinition,
  ProjectNavigationDefinition,
  NodeDefinition,
  NavigationGroupPreset,
  GroupDefinition,
  RecentlyAccessedDefinition,
  CloudLinkDefinition,
  RootNavigationItemDefinition,
} from './src/ui';

export type {
  ChromeNavigation,
  ChromeNavigationViewModel,
  NavigationServices,
  ChromeNavigationNode,
  ChromeNavigationNodeViewModel,
} from './types';
