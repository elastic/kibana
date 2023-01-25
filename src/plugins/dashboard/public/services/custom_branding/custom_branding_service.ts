/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { DashboardStartDependencies } from '../../plugin';
import { DashboardCustomBrandingService } from './types';

export type CustomBrandingServiceFactory = KibanaPluginServiceFactory<
  DashboardCustomBrandingService,
  DashboardStartDependencies
>;

export const customBrandingServiceFactory: CustomBrandingServiceFactory = (customBranding) => {
  return {
    customBranding: {
      hasCustomBranding$: customBranding.coreStart.customBranding.hasCustomBranding$,
      // eslint-disable-next-line react-hooks/rules-of-hooks
      showPlainSpinner: useObservable(
        customBranding.coreStart.customBranding.hasCustomBranding$,
        false
      ),
    },
  };
};
