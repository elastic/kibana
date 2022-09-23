/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { DashboardNavigationService } from './types';

type NavigationServiceFactory = PluginServiceFactory<DashboardNavigationService>;

export const navigationServiceFactory: NavigationServiceFactory = () => {
  const pluginMock = navigationPluginMock.createStartContract();

  return {
    TopNavMenu: pluginMock.ui.TopNavMenu,
  };
};
