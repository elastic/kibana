/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { COMPARE_ALL_OPTIONS, Filter, TimeRange, onlyDisabledFiltersChanged } from '@kbn/es-query';
import { combineLatest, distinctUntilChanged, Observable, skip, startWith } from 'rxjs';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { apiPublishesReload, apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';
import { areTimesEqual } from '../../../../dashboard_api/unified_search_manager';

const shouldRefreshFilterCompareOptions = {
  ...COMPARE_ALL_OPTIONS,
  // do not compare $state to avoid refreshing when filter is pinned/unpinned (which does not impact results)
  state: false,
};

export function newSession$(api: unknown) {
  const observables: Array<Observable<unknown>> = [];

  if (apiPublishesUnifiedSearch(api)) {
    observables.push(
      api.filters$.pipe(
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

  if (apiPublishesReload(api)) {
    observables.push(api.reload$.pipe(startWith(undefined)));
  }

  return combineLatest(observables).pipe(skip(1));
}
