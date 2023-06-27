/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { NavigationKibanaProvider, NavigationProvider } from './src/services';

export { DefaultNavigation, getPresets, Navigation } from './src/ui';

export type {
  GroupDefinition,
  NavigationGroupPreset,
  NavigationTreeDefinition,
  ProjectNavigationDefinition,
  RecentlyAccessedDefinition,
  RootNavigationItemDefinition,
} from './src/ui';

export type { NavigationServices } from './types';
