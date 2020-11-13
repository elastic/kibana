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
import { Unit } from '@elastic/datemath';
import {
  convertIntervalToUnit,
  parseInterval,
  getSuitableUnit,
} from '../vis_data/helpers/unit_to_seconds';
import { RESTRICTIONS_KEYS } from '../../../common/ui_restrictions';
import { ReqFacade } from './strategies/abstract_search_strategy';

const getTimezoneFromRequest = (request: ReqFacade<any>) => {
  return request.payload.timerange.timezone;
};

export class DefaultSearchCapabilities {
  constructor(public request: ReqFacade, public fieldsCapabilities: Record<string, any> = {}) {}

  public get defaultTimeInterval() {
    return null;
  }

  public get whiteListedMetrics() {
    return this.createUiRestriction();
  }

  public get whiteListedGroupByFields() {
    return this.createUiRestriction();
  }

  public get whiteListedTimerangeModes() {
    return this.createUiRestriction();
  }

  public get uiRestrictions() {
    return {
      [RESTRICTIONS_KEYS.WHITE_LISTED_METRICS]: this.whiteListedMetrics,
      [RESTRICTIONS_KEYS.WHITE_LISTED_GROUP_BY_FIELDS]: this.whiteListedGroupByFields,
      [RESTRICTIONS_KEYS.WHITE_LISTED_TIMERANGE_MODES]: this.whiteListedTimerangeModes,
    };
  }

  public get searchTimezone() {
    return getTimezoneFromRequest(this.request);
  }

  createUiRestriction(restrictionsObject?: Record<string, any>) {
    return {
      '*': !restrictionsObject,
      ...(restrictionsObject || {}),
    };
  }

  parseInterval(interval: string) {
    return parseInterval(interval);
  }

  getSuitableUnit(intervalInSeconds: string | number) {
    return getSuitableUnit(intervalInSeconds);
  }

  convertIntervalToUnit(intervalString: string, unit: Unit) {
    const parsedInterval = this.parseInterval(intervalString);

    if (parsedInterval?.unit !== unit) {
      return convertIntervalToUnit(intervalString, unit);
    }

    return parsedInterval;
  }

  getValidTimeInterval(intervalString: string) {
    // Default search capabilities doesn't have any restrictions for the interval string
    return intervalString;
  }
}
