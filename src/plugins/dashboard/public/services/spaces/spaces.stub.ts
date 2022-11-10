/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { DashboardSpacesService } from './types';

type SpacesServiceFactory = PluginServiceFactory<DashboardSpacesService>;

export const spacesServiceFactory: SpacesServiceFactory = () => {
  const pluginMock = spacesPluginMock.createStartContract();

  return {
    getActiveSpace$: pluginMock.getActiveSpace$,
    getLegacyUrlConflict: pluginMock.ui.components.getLegacyUrlConflict,
    redirectLegacyUrl: pluginMock.ui.redirectLegacyUrl,
  };
};
