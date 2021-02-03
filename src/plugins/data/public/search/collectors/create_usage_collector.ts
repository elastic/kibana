/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { first } from 'rxjs/operators';
import { StartServicesAccessor } from '../../../../../core/public';
import { METRIC_TYPE, UsageCollectionSetup } from '../../../../usage_collection/public';
import { SEARCH_EVENT_TYPE, SearchUsageCollector } from './types';

export const createUsageCollector = (
  getStartServices: StartServicesAccessor,
  usageCollection?: UsageCollectionSetup
): SearchUsageCollector => {
  const getCurrentApp = async () => {
    const [{ application }] = await getStartServices();
    return application.currentAppId$.pipe(first()).toPromise();
  };

  return {
    trackQueryTimedOut: async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiCounter(
        currentApp!,
        METRIC_TYPE.LOADED,
        SEARCH_EVENT_TYPE.QUERY_TIMED_OUT
      );
    },
    trackQueriesCancelled: async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiCounter(
        currentApp!,
        METRIC_TYPE.LOADED,
        SEARCH_EVENT_TYPE.QUERIES_CANCELLED
      );
    },
  };
};
