/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  apiHasParentApi,
  apiPublishesTimeRange,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import moment from 'moment';
import { BehaviorSubject, skip } from 'rxjs';
import { getTimeRangeMeta, getTimezone, TimeRangeMeta } from './get_time_range_meta';
import { getMomentTimezone } from './time_utils';
import { Services } from './types';

export function initTimeRangeSubscription(api: unknown, services: Services) {
  const rootTimeRange$ = getTimeRange$(api);
  const timeRangeMeta$ = new BehaviorSubject<TimeRangeMeta>(
    getTimeRangeMeta(rootTimeRange$.value, services)
  );

  const timeRangeSubscription = rootTimeRange$.pipe(skip(1)).subscribe((timeRange) => {
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

function getTimeRange$(api: unknown): PublishingSubject<TimeRange | undefined> {
  if (apiHasParentApi(api)) {
    return getTimeRange$(api.parentApi);
  }

  if (apiPublishesTimeRange(api)) {
    return api.timeRange$;
  }

  return new BehaviorSubject<TimeRange | undefined>(undefined);
}
