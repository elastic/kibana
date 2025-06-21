/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter } from '@kbn/es-query';
import { set } from '@kbn/safer-lodash-set';
import { get, isArray } from 'lodash';

const getTimeFields = (filter: Filter) => {
  const metaField = get(filter, 'meta.field');
  if (metaField) {
    const timeFormat = get(filter, `query.range['${metaField}'].format`);
    const timeGte = get(filter, `query.range['${metaField}'].gte`);
    const timeLte = get(filter, `query.range['${metaField}'].lte`);

    return { metaField, timeFormat, timeGte, timeLte };
  }

  return {};
};

export const overrideTimeRange = (
  currentFilters: Filter[] | Filter | undefined,
  forceNow: string
) => {
  console.log(`Current filter: ${JSON.stringify(currentFilters)}`);
  if (!currentFilters) {
    return;
  }

  const filters = isArray(currentFilters) ? currentFilters : [currentFilters];
  if (filters.length > 0) {
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
      const {
        timeFormat: maybeTimeFieldFormat,
        timeGte: maybeTimeFieldGte,
        timeLte: maybeTimeFieldLte,
      } = getTimeFields(filter);

      if (maybeTimeFieldFormat && maybeTimeFieldGte && maybeTimeFieldLte) {
        console.log(`maybeTimeFieldFormat: ${maybeTimeFieldFormat}`);
        console.log(`maybeTimeFieldGte: ${maybeTimeFieldGte}`);
        console.log(`maybeTimeFieldLte: ${maybeTimeFieldLte}`);
        try {
          Date.parse(maybeTimeFieldGte);
          Date.parse(maybeTimeFieldLte);
          return true;
        } catch (err) {
          return false;
        }
      }
      return false;
    });

    if (timeFilterIndex >= 0) {
      const timeFilter = filters[timeFilterIndex];
      const { metaField, timeGte, timeLte } = getTimeFields(timeFilter);
      if (metaField) {
        const timeGteMs = Date.parse(timeGte);
        const timeLteMs = Date.parse(timeLte);
        const timeDiffMs = timeLteMs - timeGteMs;
        const newLte = Date.parse(forceNow);
        const newGte = newLte - timeDiffMs;
        set(timeFilter, `query.range['${metaField}'].gte`, new Date(newGte).toISOString());
        set(timeFilter, `query.range['${metaField}'].lte`, forceNow);
      }
    }
  }
  console.log(`Mutated current filter: ${JSON.stringify(currentFilters)}`);
};
