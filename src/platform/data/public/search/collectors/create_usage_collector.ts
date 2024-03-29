/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { first } from 'rxjs/operators';
import { METRIC_TYPE } from '@kbn/analytics';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { SEARCH_EVENT_TYPE, SearchUsageCollector } from './types';

export const createUsageCollector = (
  getStartServices: StartServicesAccessor,
  usageCollection?: UsageCollectionSetup
): SearchUsageCollector => {
  const getCurrentApp = async () => {
    const [{ application }] = await getStartServices();
    return application.currentAppId$.pipe(first()).toPromise();
  };

  const getCollector = (metricType: UiCounterMetricType, eventType: SEARCH_EVENT_TYPE) => {
    return async () => {
      const currentApp = await getCurrentApp();
      return usageCollection?.reportUiCounter(currentApp!, metricType, eventType);
    };
  };

  return {
    trackQueryTimedOut: getCollector(METRIC_TYPE.LOADED, SEARCH_EVENT_TYPE.QUERY_TIMED_OUT),
    trackSessionIndicatorTourLoading: getCollector(
      METRIC_TYPE.LOADED,
      SEARCH_EVENT_TYPE.SESSION_INDICATOR_TOUR_LOADING
    ),
    trackSessionIndicatorTourRestored: getCollector(
      METRIC_TYPE.LOADED,
      SEARCH_EVENT_TYPE.SESSION_INDICATOR_TOUR_RESTORED
    ),
    trackSessionIndicatorSaveDisabled: getCollector(
      METRIC_TYPE.LOADED,
      SEARCH_EVENT_TYPE.SESSION_INDICATOR_SAVE_DISABLED
    ),
    trackSessionSentToBackground: getCollector(
      METRIC_TYPE.CLICK,
      SEARCH_EVENT_TYPE.SESSION_SENT_TO_BACKGROUND
    ),
    trackSessionSavedResults: getCollector(
      METRIC_TYPE.CLICK,
      SEARCH_EVENT_TYPE.SESSION_SAVED_RESULTS
    ),
    trackSessionViewRestored: getCollector(
      METRIC_TYPE.CLICK,
      SEARCH_EVENT_TYPE.SESSION_VIEW_RESTORED
    ),
    trackSessionIsRestored: getCollector(METRIC_TYPE.CLICK, SEARCH_EVENT_TYPE.SESSION_IS_RESTORED),
    trackSessionReloaded: getCollector(METRIC_TYPE.CLICK, SEARCH_EVENT_TYPE.SESSION_RELOADED),
    trackSessionExtended: getCollector(METRIC_TYPE.CLICK, SEARCH_EVENT_TYPE.SESSION_EXTENDED),
    trackSessionCancelled: getCollector(METRIC_TYPE.CLICK, SEARCH_EVENT_TYPE.SESSION_CANCELLED),
    trackSessionDeleted: getCollector(METRIC_TYPE.CLICK, SEARCH_EVENT_TYPE.SESSION_DELETED),
    trackViewSessionsList: getCollector(METRIC_TYPE.CLICK, SEARCH_EVENT_TYPE.SESSION_VIEW_LIST),
    trackSessionsListLoaded: getCollector(
      METRIC_TYPE.LOADED,
      SEARCH_EVENT_TYPE.SESSIONS_LIST_LOADED
    ),
  };
};
