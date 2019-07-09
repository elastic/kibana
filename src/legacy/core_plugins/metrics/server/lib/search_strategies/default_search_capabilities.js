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
import {
  convertIntervalToUnit,
  parseInterval,
  getSuitableUnit,
} from '../vis_data/helpers/unit_to_seconds';

const getTimezoneFromRequest = request => {
  return request.payload.timerange.timezone;
};

export class DefaultSearchCapabilities {
  constructor(request, fieldsCapabilities = {}) {
    this.request = request;
    this.fieldsCapabilities = fieldsCapabilities;
  }

  get defaultTimeInterval() {
    return null;
  }

  get whiteListedMetrics() {
    return this.createUiRestriction();
  }

  get whiteListedGroupByFields() {
    return this.createUiRestriction();
  }

  get uiRestrictions() {
    return {
      whiteListedMetrics: this.whiteListedMetrics,
      whiteListedGroupByFields: this.whiteListedGroupByFields,
    };
  }

  get searchTimezone() {
    return getTimezoneFromRequest(this.request);
  }

  createUiRestriction(restrictionsObject) {
    return {
      '*': !restrictionsObject,
      ...(restrictionsObject || {}),
    };
  }

  parseInterval(interval) {
    return parseInterval(interval);
  }

  getSuitableUnit(intervalInSeconds) {
    return getSuitableUnit(intervalInSeconds);
  }

  convertIntervalToUnit(intervalString, unit) {
    const parsedInterval = this.parseInterval(intervalString);

    if (parsedInterval.unit !== unit) {
      return convertIntervalToUnit(intervalString, unit);
    }

    return parsedInterval;
  }

  getValidTimeInterval(intervalString) {
    // Default search capabilities doesn't have any restrictions for the interval string
    return intervalString;
  }
}
