/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { DashboardUsageCollectionService } from './types';

type UsageCollectionServiceFactory = PluginServiceFactory<DashboardUsageCollectionService>;

export const usageCollectionServiceFactory: UsageCollectionServiceFactory = () => {
  const pluginMock = usageCollectionPluginMock.createSetupContract();

  return {
    reportUiCounter: pluginMock.reportUiCounter,
  };
};
