/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { apiHasParentApi, apiPublishesTimeRange } from '@kbn/presentation-publishing';
import moment from 'moment';
import { BehaviorSubject, skip } from 'rxjs';
import { getTimeRangeMeta, getTimezone, TimeRangeMeta } from './get_time_range_meta';
import { getMomentTimezone } from './time_utils';
import { Services } from './types';

export function initTimeRangeSubscription(controlGroupApi: unknown, services: Services) {
  const timeRange$ =
    apiHasParentApi(controlGroupApi) && apiPublishesTimeRange(controlGroupApi.parentApi)
      ? controlGroupApi.parentApi.timeRange$
      : new BehaviorSubject<TimeRange | undefined>(undefined);
  const timeRangeMeta$ = new BehaviorSubject<TimeRangeMeta>(
    getTimeRangeMeta(timeRange$.value, services)
  );

  const timeRangeSubscription = timeRange$.pipe(skip(1)).subscribe((timeRange) => {
    timeRangeMeta$.next(getTimeRangeMeta(timeRange, services));
  });

  return {
    timeRangeMeta$,
    formatDate: (epoch: number) => {
      return moment
        .tz(epoch, getMomentTimezone(getTimezone(services)))
        .locale(i18n.getLocale())
        .format(timeRangeMeta$.value.format);
    },
    cleanupTimeRangeSubscription: () => {
      timeRangeSubscription.unsubscribe();
    },
  };
}
