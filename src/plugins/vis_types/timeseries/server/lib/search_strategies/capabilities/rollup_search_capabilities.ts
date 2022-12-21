/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { get, has } from 'lodash';
import { leastCommonInterval, isCalendarInterval } from '../lib/interval_helper';

import {
  DefaultSearchCapabilities,
  SearchCapabilitiesOptions,
} from './default_search_capabilities';

export class RollupSearchCapabilities extends DefaultSearchCapabilities {
  rollupIndex: string;
  availableMetrics: Record<string, any>;

  constructor(
    options: SearchCapabilitiesOptions,
    fieldsCapabilities: Record<string, any>,
    rollupIndex: string
  ) {
    super(options);

    this.rollupIndex = rollupIndex;
    this.availableMetrics = get(fieldsCapabilities, `${rollupIndex}.aggs`, {});
    this.timezone = get(this.dateHistogram, 'time_zone', null);
  }

  public get dateHistogram() {
    const [dateHistogram] = Object.values<any>(this.availableMetrics.date_histogram);

    return dateHistogram;
  }

  public get defaultTimeInterval() {
    return (
      this.dateHistogram.fixed_interval ||
      this.dateHistogram.calendar_interval ||
      /*
         Deprecation: [interval] on [date_histogram] is deprecated, use [fixed_interval] or [calendar_interval] in the future.
         We can remove the following line only for versions > 8.x
        */
      this.dateHistogram.interval ||
      null
    );
  }

  public get whiteListedMetrics() {
    const baseRestrictions = this.createUiRestriction({
      count: this.createUiRestriction(),
    });

    const getFields = (fields: { [key: string]: any }) =>
      Object.keys(fields).reduce(
        (acc, item) => ({
          ...acc,
          [item]: true,
        }),
        this.createUiRestriction({})
      );

    return Object.keys(this.availableMetrics).reduce(
      (acc, item) => ({
        ...acc,
        [item]: getFields(this.availableMetrics[item]),
      }),
      baseRestrictions
    );
  }

  public get whiteListedGroupByFields() {
    return this.createUiRestriction({
      everything: true,
      terms: has(this.availableMetrics, 'terms'),
    });
  }

  public get whiteListedTimerangeModes() {
    return this.createUiRestriction({
      last_value: true,
    });
  }

  public get whiteListedConfigurationFeatures() {
    return this.createUiRestriction({
      filter: false,
    });
  }

  getValidTimeInterval(userIntervalString: string) {
    const parsedRollupJobInterval = this.parseInterval(this.defaultTimeInterval);
    const inRollupJobUnit = this.convertIntervalToUnit(
      userIntervalString,
      parsedRollupJobInterval!.unit
    );

    const getValidCalendarInterval = () => {
      let unit = parsedRollupJobInterval!.unit;

      if (inRollupJobUnit!.value > parsedRollupJobInterval!.value) {
        const inSeconds = this.convertIntervalToUnit(userIntervalString, 's');
        if (inSeconds?.value) {
          unit = this.getSuitableUnit(inSeconds.value);
        }
      }

      return {
        value: 1,
        unit,
      };
    };

    const getValidFixedInterval = () => ({
      value: leastCommonInterval(inRollupJobUnit?.value, parsedRollupJobInterval?.value),
      unit: parsedRollupJobInterval!.unit,
    });

    const { value, unit } = (
      isCalendarInterval(parsedRollupJobInterval!)
        ? getValidCalendarInterval
        : getValidFixedInterval
    )();

    return `${value}${unit}`;
  }
}
