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
import moment from 'moment';

export function timeShift(resp, panel, series) {
  return (next) => (results) => {
    if (/^([+-]?[\d]+)([shmdwMy]|ms)$/.test(series.offset_time)) {
      const matches = series.offset_time.match(/^([+-]?[\d]+)([shmdwMy]|ms)$/);

      if (matches) {
        const offsetValue = Number(matches[1]);
        const offsetUnit = matches[2];
        const offset = moment.duration(offsetValue, offsetUnit).valueOf();

        results.forEach((item) => {
          if (_.startsWith(item.id, series.id)) {
            item.data = item.data.map(([time, value]) => [time + offset, value]);
          }
        });
      }
    }

    return next(results);
  };
}
