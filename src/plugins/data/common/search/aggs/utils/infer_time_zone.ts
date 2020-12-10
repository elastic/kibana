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

import moment from 'moment';
import { IndexPattern } from '../../../index_patterns';
import { AggParamsDateHistogram } from '../buckets';

export function inferTimeZone(
  params: AggParamsDateHistogram,
  indexPattern: IndexPattern,
  isDefaultTimezone: () => boolean,
  getConfig: <T = any>(key: string) => T
) {
  let tz = params.time_zone;
  if (!tz && params.field) {
    // If a field has been configured check the index pattern's typeMeta if a date_histogram on that
    // field requires a specific time_zone
    tz = indexPattern.typeMeta?.aggs?.date_histogram?.[params.field]?.time_zone;
  }
  if (!tz) {
    // If the index pattern typeMeta data, didn't had a time zone assigned for the selected field use the configured tz
    const detectedTimezone = moment.tz.guess();
    const tzOffset = moment().format('Z');
    tz = isDefaultTimezone()
      ? detectedTimezone || tzOffset
      : // if timezone is not the default, this will always return a string
        (getConfig('dateFormat:tz') as string);
  }
  return tz;
}
