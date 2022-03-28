/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, isPlainObject, keys, findKey } from 'lodash';
import moment from 'moment';
import { IAggConfig, parseInterval } from '../aggs';
import { AggResponseBucket, TabbedRangeFilterParams, TimeRangeInformation } from './types';

type AggParams = IAggConfig['params'] & {
  drop_partials: boolean;
  ranges: TabbedRangeFilterParams[];
};

const isRangeEqual = (range1: TabbedRangeFilterParams, range2: TabbedRangeFilterParams) =>
  range1?.from === range2?.from && range1?.to === range2?.to;

export class TabifyBuckets {
  length: number;
  objectMode: boolean;
  buckets: any;
  _keys: any[] = [];

  constructor(aggResp: any, agg?: IAggConfig, timeRange?: TimeRangeInformation) {
    if (aggResp && aggResp.buckets) {
      this.buckets = aggResp.buckets;
    } else if (aggResp) {
      // Some Bucket Aggs only return a single bucket (like filter).
      // In those instances, the aggResp is the content of the single bucket.
      this.buckets = [aggResp];
    } else {
      this.buckets = [];
    }

    this.objectMode = isPlainObject(this.buckets);

    if (this.objectMode) {
      this._keys = keys(this.buckets);
      this.length = this._keys.length;
    } else {
      this.length = this.buckets.length;
    }

    if (this.length && agg) {
      this.orderBucketsAccordingToParams(agg.params);
      if (agg.params.drop_partials) {
        this.dropPartials(agg, timeRange);
      }
    }
  }

  forEach(fn: (bucket: any, key: any) => void) {
    const buckets = this.buckets;

    if (this.objectMode) {
      this._keys.forEach((key) => {
        fn(buckets[key], key);
      });
    } else {
      buckets.forEach((bucket: AggResponseBucket) => {
        fn(bucket, bucket.key);
      });
    }
  }

  private orderBucketsAccordingToParams(params: AggParams) {
    if (params.filters && this.objectMode) {
      this._keys = params.filters.map((filter: any) => {
        const query = get(filter, 'input.query.query_string.query', filter.input.query);
        const queryString = typeof query === 'string' ? query : JSON.stringify(query);

        return filter.label || queryString || '*';
      });
    } else if (params.ranges && this.objectMode) {
      this._keys = params.ranges.map((range: TabbedRangeFilterParams) =>
        findKey(this.buckets, (el: TabbedRangeFilterParams) => isRangeEqual(el, range))
      );
    } else if (params.ranges && params.field.type !== 'date') {
      let ranges = params.ranges;
      if (params.ipRangeType) {
        ranges = params.ipRangeType === 'mask' ? ranges.mask : ranges.fromTo;
      }
      this.buckets = ranges.map((range: any) => {
        if (range.mask) {
          return this.buckets.find((el: AggResponseBucket) => el.key === range.mask);
        }

        return this.buckets.find((el: TabbedRangeFilterParams) => isRangeEqual(el, range));
      });
    }
  }

  // dropPartials should only be called if the aggParam setting is enabled,
  // and the agg field is the same as the Time Range.
  private dropPartials(agg: IAggConfig, timeRange?: TimeRangeInformation) {
    if (
      !timeRange ||
      this.buckets.length <= 1 ||
      this.objectMode ||
      !timeRange.timeFields.includes(agg.params.field.name)
    ) {
      return;
    }

    // serialize to turn into resolved interval
    const interval = agg.params.used_interval
      ? parseInterval((agg.serialize().params! as { used_interval: string }).used_interval)
      : moment.duration(this.buckets[1].key - this.buckets[0].key);

    this.buckets = this.buckets.filter((bucket: AggResponseBucket) => {
      if (moment(bucket.key).isBefore(timeRange.from)) {
        return false;
      }
      if (moment(bucket.key).add(interval).isAfter(timeRange.to)) {
        return false;
      }
      return true;
    });

    this.length = this.buckets.length;
  }
}
