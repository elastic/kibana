/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { appendHash, Fields, parseInterval } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import { Duplex, PassThrough } from 'stream';
import { hashObject } from '@kbn/apm-synthtrace-client/src/lib/utils/hash';

interface MetricGroupTracker {
  tracked: Map<any, MetricGroupTracker>;
  untracked: Set<any>;
}

interface GroupingOptions<TFields extends Fields> {
  maxTotalGroups: number;
  overflowGroupingKey: string;
  overflowCountField: string;
  groups?: Array<{ field: keyof TFields & string; limit: number }>;
}

function createMetricGroupTracker(): MetricGroupTracker {
  return {
    tracked: new Map(),
    untracked: new Set(),
  };
}

const OVERFLOW_BUCKET_NAME = '_other';

export function createMetricAggregatorFactory<TFields extends Fields>() {
  return function <TMetric extends Record<string, any>, TOutput extends Record<string, any>>({
    filter,
    getAggregateKey,
    flushInterval,
    init,
    grouping,
    reduce,
    serialize,
  }: {
    filter: (event: TFields) => boolean;
    getAggregateKey: (event: TFields) => string;
    flushInterval: string;
    init: (event: TFields) => TMetric;
    grouping?: GroupingOptions<TFields>;
    reduce: (metric: TMetric, event: TFields) => void;
    serialize: (metric: TMetric) => TOutput;
  }) {
    let cb: (() => void) | undefined;

    const metrics: Map<string, TMetric & { '@timestamp'?: number }> = new Map();

    const groups = grouping?.groups ?? [];
    const overflowFieldName = grouping?.overflowCountField;

    const tracker = createMetricGroupTracker();

    const { intervalAmount, intervalUnit } = parseInterval(flushInterval);

    let nextFlush: number = Number.MIN_VALUE;

    const flushEveryMs = moment.duration(intervalAmount, intervalUnit).asMilliseconds();

    let toFlush: TMetric[] = [];

    function flush(stream: Duplex, includeCurrentMetrics: boolean, callback?: () => void) {
      const allItems = [...toFlush];

      toFlush = [];

      if (includeCurrentMetrics) {
        allItems.push(...metrics.values());
        metrics.clear();
      }

      while (allItems.length) {
        const next = allItems.shift()!;
        const serialized = serialize(next);
        const shouldWriteNext = stream.push(serialized);
        if (!shouldWriteNext) {
          toFlush = allItems;
          cb = callback;
          return;
        }
      }

      const next = cb;
      cb = undefined;
      next?.();
      callback?.();
    }

    function getNextFlush(timestamp: number) {
      return Math.ceil(timestamp / flushEveryMs) * flushEveryMs;
    }

    function getOrCreateOverflowSet(id: string, event: TFields, timestamp: number) {
      let set = metrics.get(id);
      if (!set) {
        set = init(event);
        set['@timestamp'] = timestamp;
        set[overflowFieldName] = 0;
        metrics.set(id, set);
      }

      return set;
    }

    function getOrCreateMetricSet(key: string, event: TFields, timestamp: number) {
      let set = metrics.get(key);

      if (set) {
        return set;
      }

      if (grouping && metrics.size >= grouping.maxTotalGroups) {
        const metric: TFields = {
          [grouping.overflowGroupingKey]: OVERFLOW_BUCKET_NAME,
        } as unknown as TFields;

        const trackingKey = hashObject(metric);
        set = getOrCreateOverflowSet(trackingKey, metric, timestamp);

        const isUntracked = tracker.untracked.has(trackingKey);

        if (!isUntracked) {
          tracker.untracked.add(trackingKey);
          set[overflowFieldName]!++;
        }

        return set;
      }

      let groupTrackingMap = tracker;

      const trackingObject: TFields = {} as TFields;

      for (let i = 0; i < groups.length; i++) {
        const { field, limit } = groups[i];
        const fieldValue = event[field];
        trackingObject[field] = fieldValue;

        if (groupTrackingMap.untracked.has(fieldValue)) {
          // we know that this group is untracked and we already have a matching
          // metric document
          trackingObject[field] = OVERFLOW_BUCKET_NAME as unknown as TFields[keyof TFields &
            string];
          return metrics.get(hashObject(trackingObject))!;
        }

        // we're going to add a new value to track/untrack to this group

        if (groupTrackingMap.tracked.size >= limit) {
          // we are over the limit, untrack it
          groupTrackingMap.untracked.add(fieldValue);
          trackingObject[field] = OVERFLOW_BUCKET_NAME as unknown as TFields[keyof TFields &
            string];

          const overflowBucketKey = hashObject(trackingObject);

          // an overflow bucket metricset might already exist
          set = getOrCreateOverflowSet(overflowBucketKey, trackingObject, timestamp);

          // increase the overflow count
          set[overflowFieldName]!++;

          return set;
        }

        let nextGroupTrackingMap = groupTrackingMap.tracked.get(fieldValue);
        // we're not tracking this group yet, so we create a group tracker
        if (!nextGroupTrackingMap) {
          nextGroupTrackingMap = createMetricGroupTracker();
          groupTrackingMap.tracked.set(fieldValue, nextGroupTrackingMap);
        }

        groupTrackingMap = nextGroupTrackingMap;
      }
      // metric fits within all limits
      set = init(event);
      set['@timestamp'] = timestamp;
      metrics.set(key, set);
      return set;
    }

    return new PassThrough({
      objectMode: true,
      read() {
        flush(this, false, cb);
      },
      final(callback) {
        flush(this, true, callback);
      },
      write(event: TFields, encoding, callback) {
        if (!filter(event)) {
          callback();
          return;
        }

        const timestamp = event['@timestamp']!;

        function writeMetric() {
          const truncatedTimestamp = Math.floor(timestamp / flushEveryMs) * flushEveryMs;

          const key = appendHash(getAggregateKey(event), truncatedTimestamp.toString());

          let set = getOrCreateMetricSet(key, event, truncatedTimestamp);

          reduce(set, event);

          callback();
        }

        if (timestamp > nextFlush) {
          nextFlush = getNextFlush(timestamp);
          flush(this, true, writeMetric);
        } else {
          writeMetric();
        }
      },
    });
  };
}
