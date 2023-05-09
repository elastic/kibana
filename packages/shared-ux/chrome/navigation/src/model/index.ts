/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BasePathService, NavigateToUrlFn } from '../../types/internal';
import { analyticsItemSet } from './platform_nav/analytics';
import { devtoolsItemSet } from './platform_nav/devtools';
import { mlItemSet } from './platform_nav/machine_learning';
import { managementItemSet } from './platform_nav/management';

export interface NavigationModelDeps {
  basePath: BasePathService;
  navigateToUrl: NavigateToUrlFn;
}

/**
 * @public
 */
export enum Platform {
  Analytics = 'analytics',
  MachineLearning = 'ml',
  DevTools = 'devTools',
  Management = 'management',
}

/**
 * @public
 */
export const navItemSet = {
  [Platform.Analytics]: analyticsItemSet,
  [Platform.MachineLearning]: mlItemSet,
  [Platform.DevTools]: devtoolsItemSet,
  [Platform.Management]: managementItemSet,
};

export { NavigationModel } from './model';
