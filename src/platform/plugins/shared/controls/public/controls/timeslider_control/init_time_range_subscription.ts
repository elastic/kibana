/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { apiPublishesTimeRange } from '@kbn/presentation-publishing';
import moment from 'moment';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, skip } from 'rxjs';
import { apiPublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import type { TimeRangeMeta } from './get_time_range_meta';
import { getTimeRangeMeta, getTimezone } from './get_time_range_meta';
import { getMomentTimezone } from './time_utils';

export function initTimeRangeSubscription(parentApi: unknown) {
  const timeRange$ = apiPublishesTimeRange(parentApi)
    ? parentApi.timeRange$
    : new BehaviorSubject<TimeRange | undefined>(undefined);

  const timeRangeMeta$ = new BehaviorSubject<TimeRangeMeta>(getTimeRangeMeta(timeRange$.value));

  const timeRangeSubscription = timeRange$.pipe(skip(1)).subscribe((timeRange) => {
    timeRangeMeta$.next(getTimeRangeMeta(timeRange));
  });

  let reloadSubscription: undefined | Subscription;
  if (apiPublishesReload(parentApi)) {
    reloadSubscription = parentApi.reload$.subscribe(() => {
      timeRangeMeta$.next(getTimeRangeMeta(timeRange$.value));
    });
  }

  return {
    timeRangeMeta$,
    formatDate: (epoch: number) => {
      return moment
        .tz(epoch, getMomentTimezone(getTimezone()))
        .locale(i18n.getLocale())
        .format(timeRangeMeta$.value.format);
    },
    cleanupTimeRangeSubscription: () => {
      reloadSubscription?.unsubscribe();
      timeRangeSubscription.unsubscribe();
    },
  };
}
