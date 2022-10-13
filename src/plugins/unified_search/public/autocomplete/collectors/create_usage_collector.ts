/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { first } from 'rxjs/operators';
import { METRIC_TYPE } from '@kbn/analytics';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { AUTOCOMPLETE_EVENT_TYPE, AutocompleteUsageCollector } from './types';

export const createUsageCollector = (
  getStartServices: StartServicesAccessor,
  usageCollection?: UsageCollectionSetup
): AutocompleteUsageCollector => {
  const getCurrentApp = async () => {
    const [{ application }] = await getStartServices();
    return application.currentAppId$.pipe(first()).toPromise();
  };

  return {
    trackCall: async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiCounter(
        currentApp!,
        METRIC_TYPE.LOADED,
        AUTOCOMPLETE_EVENT_TYPE.CALL
      );
    },
    trackRequest: async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiCounter(
        currentApp!,
        METRIC_TYPE.LOADED,
        AUTOCOMPLETE_EVENT_TYPE.REQUEST
      );
    },
    trackResult: async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiCounter(
        currentApp!,
        METRIC_TYPE.LOADED,
        AUTOCOMPLETE_EVENT_TYPE.RESULT
      );
    },
    trackError: async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiCounter(
        currentApp!,
        METRIC_TYPE.LOADED,
        AUTOCOMPLETE_EVENT_TYPE.ERROR
      );
    },
  };
};
