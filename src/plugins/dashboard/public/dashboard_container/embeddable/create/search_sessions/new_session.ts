/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, TimeRange, onlyDisabledFiltersChanged } from '@kbn/es-query';
import { combineLatest, distinctUntilChanged, Observable, skip } from 'rxjs';
import { shouldRefreshFilterCompareOptions } from '@kbn/embeddable-plugin/public';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { areTimesEqual } from '../../../state/diffing/dashboard_diffing_utils';
import { DashboardContainer } from '../../dashboard_container';

export function newSession$(api: unknown) {
  const observables: Array<Observable<unknown>> = [];

  if (apiPublishesUnifiedSearch(api)) {
    observables.push(
      api.filters$.pipe(
        // TODO move onlyDisabledFiltersChanged to appliedFilters$ interface
        distinctUntilChanged((previous: Filter[] | undefined, current: Filter[] | undefined) => {
          return onlyDisabledFiltersChanged(previous, current, shouldRefreshFilterCompareOptions);
        })
      )
    );
    observables.push(api.query$);
    observables.push(
      api.timeRange$.pipe(
        distinctUntilChanged((previous: TimeRange | undefined, current: TimeRange | undefined) => {
          return (
            areTimesEqual(current?.from, previous?.from) && areTimesEqual(current?.to, previous?.to)
          );
        })
      )
    );
    if (api.timeRestore$) {
      observables.push(api.timeRestore$);
    }
    if (api.timeslice$) {
      observables.push(api.timeslice$);
    }
  }

  if (apiPublishesSettings(api)) {
    if (api.settings.syncColors$) {
      observables.push(api.settings.syncColors$);
    }
    if (api.settings.syncCursor$) {
      observables.push(api.settings.syncCursor$);
    }
    if (api.settings.syncTooltips$) {
      observables.push(api.settings.syncTooltips$);
    }
  }

  // TODO replace lastReloadRequestTime$ with reload$ when removing legacy embeddable framework
  if ((api as DashboardContainer).lastReloadRequestTime$) {
    observables.push((api as DashboardContainer).lastReloadRequestTime$);
  }

  return combineLatest(observables).pipe(skip(1));
}
