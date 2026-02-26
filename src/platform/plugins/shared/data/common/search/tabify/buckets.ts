/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get, isPlainObject, keys, findKey } from 'lodash';
import moment from 'moment-timezone';
import type { IAggConfig } from '../aggs';
import { parseInterval } from '../aggs';
import type { AggResponseBucket, TabbedRangeFilterParams, TimeRangeInformation } from './types';

type AggParams = IAggConfig['params'] & {
  drop_partials: boolean;
  ranges: TabbedRangeFilterParams[];
};

const isRangeEqual = (range1: TabbedRangeFilterParams, range2: TabbedRangeFilterParams) =>
  range1?.from === range2?.from && range1?.to === range2?.to;

export class TabifyBuckets {
  length: number;
  objectMode: boolean;
  buckets: unknown[] | Record<string, unknown>;
  _keys: unknown[] = [];

  constructor(
    aggResp: Record<string, unknown> | undefined,
    agg?: IAggConfig,
    timeRange?: TimeRangeInformation
  ) {
    if (aggResp && aggResp.buckets) {
      this.buckets = aggResp.buckets as unknown[] | Record<string, unknown>;
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
      this.length = (this.buckets as unknown[]).length;
    }

    if (this.length && agg) {
      this.orderBucketsAccordingToParams(agg.params as unknown as AggParams);
      if ((agg.params as unknown as AggParams).drop_partials) {
        this.dropPartials(agg, timeRange);
      }
    }
  }

  forEach(fn: (bucket: unknown, key: unknown) => void) {
    const buckets = this.buckets;

    if (this.objectMode) {
      const objBuckets = buckets as Record<string, unknown>;
      for (let i = 0; i < this._keys.length; i++) {
        const key = this._keys[i] as string;
        fn(objBuckets[key], key);
      }
    } else {
      const arrBuckets = buckets as Array<Record<string, unknown>>;
      for (let i = 0; i < arrBuckets.length; i++) {
        const bucket = arrBuckets[i];
        fn(bucket, bucket.key);
      }
    }
  }

  private orderBucketsAccordingToParams(params: AggParams) {
    if (params.filters && this.objectMode) {
      this._keys = (params.filters as Array<Record<string, unknown>>).map(
        (filter: Record<string, unknown>) => {
          const query = get(
            filter,
            'input.query.query_string.query',
            (filter as Record<string, unknown>).input &&
              ((filter as Record<string, unknown>).input as Record<string, unknown>).query
          );
          const queryString = typeof query === 'string' ? query : JSON.stringify(query);

          return (filter.label as string) || queryString || '*';
        }
      );
    } else if (params.ranges && this.objectMode) {
      this._keys = params.ranges.map((range: TabbedRangeFilterParams) =>
        findKey(this.buckets as Record<string, unknown>, (el: unknown) =>
          isRangeEqual(el as TabbedRangeFilterParams, range)
        )
      );
    } else if (params.ranges && (params.field as Record<string, unknown>).type !== 'date') {
      let ranges = params.ranges as Record<string, unknown>[];
      if ((params as Record<string, unknown>).ipRangeType) {
        ranges =
          (params as Record<string, unknown>).ipRangeType === 'mask'
            ? ((ranges as unknown as Record<string, unknown>).mask as Record<string, unknown>[])
            : ((ranges as unknown as Record<string, unknown>).fromTo as Record<string, unknown>[]);
      }
      this.buckets = ranges.map((range: Record<string, unknown>) => {
        if (range.mask) {
          return (this.buckets as AggResponseBucket[]).find(
            (el: AggResponseBucket) => el.key === range.mask
          );
        }

        return (this.buckets as TabbedRangeFilterParams[]).find((el: TabbedRangeFilterParams) =>
          isRangeEqual(el, range as unknown as TabbedRangeFilterParams)
        );
      }) as unknown[];
    }
  }

  // dropPartials should only be called if the aggParam setting is enabled,
  // and the agg field is the same as the Time Range.
  private dropPartials(agg: IAggConfig, timeRange?: TimeRangeInformation) {
    if (!Array.isArray(this.buckets)) {
      return;
    }

    if (
      !timeRange ||
      this.buckets.length <= 1 ||
      this.objectMode ||
      !timeRange.timeFields.includes(agg.params.field.name)
    ) {
      return;
    }

    const bucketArr = this.buckets as AggResponseBucket[];
    // serialize to turn into resolved interval
    const interval = agg.params.used_interval
      ? parseInterval((agg.serialize().params! as { used_interval: string }).used_interval)
      : moment.duration(bucketArr[1].key - bucketArr[0].key);

    this.buckets = (this.buckets as AggResponseBucket[]).filter((bucket: AggResponseBucket) => {
      if (moment.tz(bucket.key, agg.aggConfigs.timeZone).isBefore(timeRange.from)) {
        return false;
      }
      if (moment.tz(bucket.key, agg.aggConfigs.timeZone).add(interval).isAfter(timeRange.to)) {
        return false;
      }
      return true;
    });

    this.length = this.buckets.length;
  }
}
