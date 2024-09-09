/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardApplicationService } from './types';

type ApplicationServiceFactory = PluginServiceFactory<DashboardApplicationService>;

export const applicationServiceFactory: ApplicationServiceFactory = () => {
  const pluginMock = applicationServiceMock.createStartContract();

  return {
    currentAppId$: pluginMock.currentAppId$,
    navigateToApp: pluginMock.navigateToApp,
    navigateToUrl: pluginMock.navigateToUrl,
    getUrlForApp: pluginMock.getUrlForApp,
    capabilities: {
      advancedSettings: pluginMock.capabilities.advancedSettings,
      maps: pluginMock.capabilities.maps,
      navLinks: pluginMock.capabilities.navLinks,
      visualize: pluginMock.capabilities.visualize,
    },
  };
};
