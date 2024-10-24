/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment, { Moment } from 'moment';
import { Filter, TimeRange, onlyDisabledFiltersChanged } from '@kbn/es-query';
import { combineLatest, distinctUntilChanged, Observable, skip } from 'rxjs';
import { shouldRefreshFilterCompareOptions } from '@kbn/embeddable-plugin/public';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { apiPublishesReload, apiPublishesUnifiedSearch } from '@kbn/presentation-publishing';

const convertTimeToUTCString = (time?: string | Moment): undefined | string => {
  if (moment(time).isValid()) {
    return moment(time).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } else {
    // If it's not a valid moment date, then it should be a string representing a relative time
    // like 'now' or 'now-15m'.
    return time as string;
  }
};

export const areTimesEqual = (
  timeA?: string | Moment | undefined,
  timeB?: string | Moment | undefined
) => {
  return convertTimeToUTCString(timeA) === convertTimeToUTCString(timeB);
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
    observables.push(api.reload$);
  }

  return combineLatest(observables).pipe(skip(1));
}
