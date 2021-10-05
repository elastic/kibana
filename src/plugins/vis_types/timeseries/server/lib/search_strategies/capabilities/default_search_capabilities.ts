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
import {
  TIME_RANGE_DATA_MODES,
  PANEL_TYPES,
  BUCKET_TYPES,
  TSVB_METRIC_TYPES,
} from '../../../../common/enums';
import { getAggsByType, AGG_TYPE } from '../../../../common/agg_utils';
import type { Panel } from '../../../../common/types';

export interface SearchCapabilitiesOptions {
  timezone?: string;
  maxBucketsLimit: number;
  panel?: Panel;
}

export class DefaultSearchCapabilities {
  public timezone: SearchCapabilitiesOptions['timezone'];
  public maxBucketsLimit: SearchCapabilitiesOptions['maxBucketsLimit'];
  public panel?: Panel;

  constructor(options: SearchCapabilitiesOptions) {
    this.timezone = options.timezone;
    this.maxBucketsLimit = options.maxBucketsLimit;
    this.panel = options.panel;
  }

  public get defaultTimeInterval() {
    return null;
  }

  public get whiteListedMetrics() {
    if (
      this.panel &&
      this.panel.type !== PANEL_TYPES.TIMESERIES &&
      this.panel.time_range_mode === TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE
    ) {
      const aggs = getAggsByType<string>((agg) => agg.id);
      const allAvailableAggs = [
        ...aggs[AGG_TYPE.METRIC],
        ...aggs[AGG_TYPE.SIBLING_PIPELINE],
        TSVB_METRIC_TYPES.MATH,
        BUCKET_TYPES.TERMS,
      ].reduce(
        (availableAggs, aggType) => ({
          ...availableAggs,
          [aggType]: {
            '*': true,
          },
        }),
        {}
      );
      return this.createUiRestriction(allAvailableAggs);
    }
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
