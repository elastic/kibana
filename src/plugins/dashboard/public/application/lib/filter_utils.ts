/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import moment, { Moment } from 'moment';
import type { Filter } from '@kbn/es-query';

/**
 * Converts the time to a utc formatted string. If the time is not valid (e.g. it might be in a relative format like
 * 'now-15m', then it just returns what it was passed).
 * @param time {string|Moment}
 * @returns the time represented in utc format, or if the time range was not able to be parsed into a moment
 * object, it returns the same object it was given.
 */
export const convertTimeToUTCString = (time?: string | Moment): undefined | string => {
  if (moment(time).isValid()) {
    return moment(time).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } else {
    // If it's not a valid moment date, then it should be a string representing a relative time
    // like 'now' or 'now-15m'.
    return time as string;
  }
};

export const areTimesEqual = (timeA?: string | Moment, timeB?: string | Moment) => {
  return convertTimeToUTCString(timeA) === convertTimeToUTCString(timeB);
};

/**
 * Depending on how a dashboard is loaded, the filter object may contain a $$hashKey and $state that will throw
 * off a filter comparison. This removes those variables.
 * @param filters {Array.<Object>}
 * @returns {Array.<Object>}
 */
export const cleanFiltersForComparison = (filters: Filter[]) => {
  return _.map(filters, (filter) => {
    const f: Partial<Filter> = _.omit(filter, ['$$hashKey', '$state']);
    if (f.meta) {
      // f.meta.value is the value displayed in the filter bar.
      // It may also be loaded differently and shouldn't be used in this comparison.
      return _.omit(f.meta, ['value']);
    }
    return f;
  });
};

export const cleanFiltersForSerialize = (filters: Filter[]): Filter[] => {
  return filters.map((filter) => {
    if (filter.meta?.value) {
      delete filter.meta.value;
    }
    return filter;
  });
};
