/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SerializableRecord } from '@kbn/utility-types';
import { extend, defaults } from 'lodash';
import { getTimeZoneFromSettings } from '../utils';
import { isEsQueryString } from './es_query_dsl';

/**
 * Decorate queries with default parameters
 * @param query object
 * @param queryStringOptions query:queryString:options from UI settings
 * @param dateFormatTZ dateFormat:tz from UI settings
 * @returns {object}
 *
 * @public
 */

export function decorateQuery(
  query: estypes.QueryDslQueryContainer,
  queryStringOptions: SerializableRecord | string,
  dateFormatTZ?: string
) {
  if (isEsQueryString(query)) {
    // NOTE queryStringOptions comes from UI Settings and, in server context, is a serialized string
    // https://github.com/elastic/kibana/issues/89902
    if (typeof queryStringOptions === 'string') {
      queryStringOptions = JSON.parse(queryStringOptions);
    }

    extend(query.query_string, queryStringOptions);
    if (dateFormatTZ) {
      defaults(query.query_string, {
        time_zone: getTimeZoneFromSettings(dateFormatTZ),
      });
    }
  }

  return query;
}
