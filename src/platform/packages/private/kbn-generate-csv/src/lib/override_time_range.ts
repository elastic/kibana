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

interface OverrideTimeRangeOpts {
  currentFilters: Filter[] | Filter | undefined;
  forceNow: string;
  logger: Logger;
  timeFieldName?: string;
}
export const overrideTimeRange = ({
  currentFilters,
  forceNow,
  logger,
  timeFieldName,
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
      return isValidDateTime(maybeTimeFieldGte) && isValidDateTime(maybeTimeFieldLte);
    }
    return false;
  });

  if (timeFilterIndex >= 0) {
    try {
      const timeFilter = cloneDeep(filters[timeFilterIndex]);
      const { metaField, timeGte, timeLte } = getTimeFields(timeFilter, timeFieldName);
      if (metaField && timeGte && timeLte) {
        const timeGteMs = Date.parse(timeGte);
        const timeLteMs = Date.parse(timeLte);
        const timeDiffMs = timeLteMs - timeGteMs;
        const newLte = Date.parse(forceNow);
        const newGte = newLte - timeDiffMs;

        const timeFieldAccessorString = getTimeFieldAccessorString(metaField);
        set(timeFilter, `${timeFieldAccessorString}.gte`, new Date(newGte).toISOString());
        set(timeFilter, `${timeFieldAccessorString}.lte`, forceNow);

        filters.splice(timeFilterIndex, 1, timeFilter);
        return filters;
      }
    } catch (error) {
      logger.warn(`Error calculating updated time range: ${error.message}`);
    }
  }
};
