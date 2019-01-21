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
import { INTERVAL_STRING_RE } from '../../../common/interval_regexp';
import unitToSeconds from '../vis_data/helpers/unit_to_seconds';

const convertUnitToSeconds = interval => {
  const matches = interval && interval.match(INTERVAL_STRING_RE);

  return matches ? Number(matches[1]) * unitToSeconds(matches[2]) : 0;
};

const getTimezoneFromRequest = request => {
  return request.payload.timerange.timezone;
};

export default class DefaultSearchCapabilities {
  constructor(request, batchRequestsSupport, fieldsCapabilities = {}) {
    this.request = request;
    this.batchRequestsSupport = batchRequestsSupport;
    this.fieldsCapabilities = fieldsCapabilities;

    this.validateTimeIntervalRules = [];
  }

  get fixedTimeZone() {
    return null;
  }

  get defaultTimeInterval() {
    return null;
  }

  getSearchTimezone() {
    return this.fixedTimeZone || getTimezoneFromRequest(this.request);
  }

  isTimeIntervalValid(intervalString) {
    const userInterval = convertUnitToSeconds(intervalString);
    const defaultInterval = convertUnitToSeconds(this.defaultTimeInterval);

    return this.validateTimeIntervalRules
      .every(validationRule => validationRule(userInterval, defaultInterval));
  }

  getSearchInterval(intervalString) {
    return this.isTimeIntervalValid(intervalString) ? intervalString : this.defaultTimeInterval;
  }

  getFieldsByAggregationType(aggregationType) {
    const fields = {};

    Object.keys(this.fieldsCapabilities).forEach(fieldKey => {
      this.fieldsCapabilities[fieldKey].some(aggregation => {
        if (aggregation.agg === aggregationType) {
          fields[fieldKey] = aggregation;

          return true;
        }
      });
    });
    return fields;
  }
}
