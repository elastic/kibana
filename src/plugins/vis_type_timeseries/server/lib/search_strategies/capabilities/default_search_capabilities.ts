/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Unit } from '@elastic/datemath';
import {
  convertIntervalToUnit,
  parseInterval,
  getSuitableUnit,
} from '../../vis_data/helpers/unit_to_seconds';
import { RESTRICTIONS_KEYS } from '../../../../common/ui_restrictions';
import { VisTypeTimeseriesRequest, VisTypeTimeseriesVisDataRequest } from '../../../types';

const isVisDataRequest = (
  request: VisTypeTimeseriesRequest
): request is VisTypeTimeseriesVisDataRequest => {
  return !!(request as VisTypeTimeseriesVisDataRequest).body;
};

const getTimezoneFromRequest = (request: VisTypeTimeseriesRequest) => {
  if (isVisDataRequest(request)) return request.body.timerange.timezone;
};

export class DefaultSearchCapabilities {
  constructor(
    public request: VisTypeTimeseriesRequest,
    public fieldsCapabilities: Record<string, any> = {}
  ) {}

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
