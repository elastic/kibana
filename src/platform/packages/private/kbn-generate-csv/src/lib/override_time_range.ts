/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { set } from '@kbn/safer-lodash-set';
import type { Logger } from '@kbn/core/server';
import { cloneDeep, get, has, isArray } from 'lodash';
import moment from 'moment-timezone';
import dateMath from '@kbn/datemath';

/**
 * Builds a moment-like factory bound to the given timezone, suitable for passing as
 * `momentInstance` to `dateMath.parse`. `dateMath.parse` calls `momentInstance.isMoment`,
 * so a bare arrow function is not sufficient — it must carry the `isMoment` static.
 */
const getTzMomentInstance = (timezone?: string): typeof moment => {
  const tzMoment = ((input?: moment.MomentInput) =>
    moment.tz(input, timezone ?? 'UTC')) as typeof moment;
  return Object.assign(tzMoment, moment);
};

interface TimeFields {
  metaField?: string;
  timeFormat?: string;
  timeGte?: string;
  timeLte?: string;
}
const getTimeFieldAccessorString = (metaField: string): string => `query.range['${metaField}']`;
const getTimeFields = (filter: Filter, timeFieldName?: string): TimeFields => {
  const metaField: string | undefined = get(filter, 'meta.field') || timeFieldName;
  if (metaField) {
    const timeFieldAccessorString = getTimeFieldAccessorString(metaField);
    const timeFormat = get(filter, `${timeFieldAccessorString}.format`);
    const timeGte = get(filter, `${timeFieldAccessorString}.gte`);
    const timeLte = get(filter, `${timeFieldAccessorString}.lte`);

    return { metaField, timeFormat, timeGte, timeLte };
  }

  return {};
};

const isValidDateTime = (dateString: string): boolean => {
  const date = Date.parse(dateString);
  return !isNaN(date) && date > 0;
};

const isValidDateMath = (value: string): boolean => {
  const result = dateMath.parse(value);
  return result !== undefined && result.isValid();
};

interface OverrideTimeRangeOpts {
  currentFilters: Filter[] | Filter | undefined;
  forceNow: string;
  logger: Logger;
  timeFieldName?: string;
  /**
   * The report's timezone (e.g. from `browserTimezone` / the `dateformat:tz` advanced setting).
   * Used to anchor calendar-rounded date math (`now/d`, `now/w`, `now/M`, ...) to the same
   * day/week/month boundaries the user saw in the browser, rather than the reporting server's
   * local timezone. Falls back to UTC when omitted.
   */
  timezone?: string;
}
export const overrideTimeRange = ({
  currentFilters,
  forceNow,
  logger,
  timeFieldName,
  timezone,
}: OverrideTimeRangeOpts): Filter[] | undefined => {
  if (!currentFilters) {
    return;
  }

  const filters = isArray(currentFilters) ? currentFilters : [currentFilters];
  if (filters.length === 0) {
    return;
  }

  // Looking for filters with this format which indicate a time range:
  //   {
  //     "meta": {
  //         "field": <timeFieldName>,
  //         "index": <indexId>,
  //         "params": {}
  //     },
  //     "query": {
  //         "range": {
  //             <timeFieldName>: {
  //                 "format": "strict_date_optional_time",
  //                 "gte": "2025-06-18T18:29:53.537Z",
  //                 "lte": "2025-06-18T18:54:53.537Z"
  //             }
  //         }
  //     }
  // }
  const timeFilterIndex = filters.findIndex((filter) => {
    if (has(filter, '$state')) {
      return false;
    }

    const {
      timeFormat: maybeTimeFieldFormat,
      timeGte: maybeTimeFieldGte,
      timeLte: maybeTimeFieldLte,
    } = getTimeFields(filter, timeFieldName);

    if (maybeTimeFieldFormat && maybeTimeFieldGte && maybeTimeFieldLte) {
      const bothAbsolute = isValidDateTime(maybeTimeFieldGte) && isValidDateTime(maybeTimeFieldLte);
      const bothDateMath = isValidDateMath(maybeTimeFieldGte) && isValidDateMath(maybeTimeFieldLte);
      return bothAbsolute || bothDateMath;
    }
    return false;
  });

  if (timeFilterIndex >= 0) {
    try {
      const timeFilter = cloneDeep(filters[timeFilterIndex]);
      const { metaField, timeGte, timeLte } = getTimeFields(timeFilter, timeFieldName);
      if (metaField && timeGte && timeLte) {
        const timeFieldAccessorString = getTimeFieldAccessorString(metaField);

        if (isValidDateTime(timeGte) && isValidDateTime(timeLte)) {
          // Absolute ISO datetimes: slide the frozen window so it ends at forceNow.
          // This preserves backward compatibility for scheduled payloads stored before
          // the switch to relative date math.
          const timeGteMs = Date.parse(timeGte);
          const timeLteMs = Date.parse(timeLte);
          const timeDiffMs = timeLteMs - timeGteMs;
          const newLte = Date.parse(forceNow);
          const newGte = newLte - timeDiffMs;

          set(timeFilter, `${timeFieldAccessorString}.gte`, new Date(newGte).toISOString());
          set(timeFilter, `${timeFieldAccessorString}.lte`, forceNow);
        } else {
          // Date math strings (e.g. "now-24h", "now/d"): resolve each expression against
          // forceNow so the window is anchored to the scheduled run time, not the wall clock.
          // Rounding (the "/d", "/w", "/M" part) is done using a moment instance bound to the
          // report's timezone, so "Today" etc. line up with the user's day/week/month boundaries
          // instead of the reporting server's local timezone.
          const forceNowDate = new Date(forceNow);
          const tzMomentInstance = getTzMomentInstance(timezone);
          const resolvedGte = dateMath.parse(timeGte, {
            forceNow: forceNowDate,
            momentInstance: tzMomentInstance,
          });
          const resolvedLte = dateMath.parse(timeLte, {
            roundUp: true,
            forceNow: forceNowDate,
            momentInstance: tzMomentInstance,
          });

          if (!resolvedGte || !resolvedLte) {
            logger.warn(
              `Could not resolve date math time range (gte: ${timeGte}, lte: ${timeLte})`
            );
            return;
          }

          set(timeFilter, `${timeFieldAccessorString}.gte`, resolvedGte.toISOString());
          set(timeFilter, `${timeFieldAccessorString}.lte`, resolvedLte.toISOString());
        }

        filters.splice(timeFilterIndex, 1, timeFilter);
        return filters;
      }
    } catch (error) {
      logger.warn(`Error calculating updated time range: ${error.message}`);
    }
  }
};
