/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chromeServiceMock } from '@kbn/core/public/mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardChromeService } from './types';

type ChromeServiceFactory = PluginServiceFactory<DashboardChromeService>;

export const chromeServiceFactory: ChromeServiceFactory = () => {
  const pluginMock = chromeServiceMock.createStartContract();

  return {
    docTitle: pluginMock.docTitle,
    setBadge: pluginMock.setBadge,
    getIsVisible$: pluginMock.getIsVisible$,
    recentlyAccessed: pluginMock.recentlyAccessed,
    setBreadcrumbs: pluginMock.setBreadcrumbs,
    setHelpExtension: pluginMock.setHelpExtension,
    setIsVisible: pluginMock.setIsVisible,
  };
};
