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

/**
 * Format a milliseconds value as a string
 *
 * @param {number} val
 * @return {string}
 */
export function ms(val) {
  const duration = moment.duration(val);
  if (duration.days() >= 1) {
    return duration.days().toFixed(1) + 'd';
  }

  if (duration.hours() >= 1) {
    return duration.hours().toFixed(1) + 'h';
  }

  if (duration.minutes() >= 1) {
    return duration.minutes().toFixed(1) + 'm';
  }

  if (duration.seconds() >= 1) {
    return duration.as('seconds').toFixed(1) + 's';
  }

  return val + 'ms';
}
