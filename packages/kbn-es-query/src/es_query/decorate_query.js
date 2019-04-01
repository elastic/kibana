/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import moment from 'moment-timezone';
const detectedTimezone = moment.tz.guess();

/**
 * Decorate queries with default parameters
 * @param query object
 * @param queryStringOptions query:queryString:options from UI settings
 * @param dateFormatTZ dateFormat:tz from UI settings
 * @returns {object}
 */

export function decorateQuery(query, queryStringOptions, dateFormatTZ) {
  // TODO: A user could potentially put in a full ISO dateTime that has a timezone in it. What happens when the timezone they put in is different to the time_zone that is set by default?
  if (_.has(query, 'query_string.query')) {
    _.extend(query.query_string, queryStringOptions);
    if (dateFormatTZ) {
      _.defaults(query.query_string, { time_zone: dateFormatTZ === 'Browser' ? detectedTimezone : dateFormatTZ });
    }
  }

  return query;
}
