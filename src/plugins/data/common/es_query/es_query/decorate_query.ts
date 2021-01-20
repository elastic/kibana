/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { extend, defaults } from 'lodash';
import { getTimeZoneFromSettings } from '../utils';
import { DslQuery, isEsQueryString } from './es_query_dsl';

/**
 * Decorate queries with default parameters
 * @param query object
 * @param queryStringOptions query:queryString:options from UI settings
 * @param dateFormatTZ dateFormat:tz from UI settings
 * @returns {object}
 */

export function decorateQuery(
  query: DslQuery,
  queryStringOptions: Record<string, any>,
  dateFormatTZ?: string
) {
  if (isEsQueryString(query)) {
    extend(query.query_string, queryStringOptions);
    if (dateFormatTZ) {
      defaults(query.query_string, {
        time_zone: getTimeZoneFromSettings(dateFormatTZ),
      });
    }
  }

  return query;
}
