/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { customBrandingServiceMock } from '@kbn/core-custom-branding-browser-mocks';
import { of } from 'rxjs';
import { DashboardCustomBrandingService } from './types';

type CustomBrandingServiceFactory = PluginServiceFactory<DashboardCustomBrandingService>;

export const customBrandingServiceFactory: CustomBrandingServiceFactory = () => {
  const pluginMock = customBrandingServiceMock.createStartContract();
  return {
    customBranding: {
      hasCustomBranding$: pluginMock.hasCustomBranding$,
      showPlainSpinner: pluginMock.hasCustomBranding$.subscribe((data) => of(true)) ? true : false,
    },
  };
};
