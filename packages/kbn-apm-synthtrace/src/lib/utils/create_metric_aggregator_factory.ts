/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmFields, appendHash, Fields, parseInterval } from '@kbn/apm-synthtrace-client';
import moment from 'moment';
import { Duplex, PassThrough } from 'stream';

export interface TrackingMetricGroupMap {
  tracked?: Map<keyof ApmFields, TrackingMetricGroupMap>;
  untracked?: Map<keyof ApmFields, TrackingMetricGroupMap>;
}

export interface GroupFields {
  field: keyof ApmFields;
  limit: number;
}

export function createMetricAggregatorFactory<TFields extends Fields>() {
  return function <TMetric extends Record<string, any>, TOutput extends Record<string, any>>({
    filter,
    getAggregateKey,
    flushInterval,
    init,
    aggregatorLimit,
    group,
    reduce,
    serialize,
  }: {
    filter: (event: TFields) => boolean;
    getAggregateKey: (event: TFields) => string;
    flushInterval: string;
    init: (event: TFields) => TMetric;
    aggregatorLimit?: { field: keyof ApmFields; value: number };
    group?: GroupFields[];
    reduce: (metric: TMetric, event: TFields) => void;
    serialize: (metric: TMetric) => TOutput;
  }) {
    let cb: (() => void) | undefined;

    const metrics: Map<string, TMetric & { '@timestamp'?: number }> = new Map();
    const groupedMetricsMap: TrackingMetricGroupMap = {};

    const OVERFLOW_BUCKET_NAME = '_other';

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

        function computeKeyWrapper(truncatedTimestamp: number) {
          return (_event: TFields) =>
            appendHash(getAggregateKey(_event), truncatedTimestamp.toString());
        }

        function getMetricByKeyWrapper(truncatedTimestamp: number) {
          return (key: string) => {
            let set = metrics.get(key);
            if (!set) {
              set = init({ ...event });
              set['@timestamp'] = truncatedTimestamp;
            }
            return set;
          };
        }

        function writeMetric() {
          const truncatedTimestamp = Math.floor(timestamp / flushEveryMs) * flushEveryMs;
          const computeKey = computeKeyWrapper(truncatedTimestamp);
          const getMetricByKey = getMetricByKeyWrapper(truncatedTimestamp);

          let key = computeKey(event);
          let set = getMetricByKey(key);

          // Always check for Global aggregator Limit 1st
          if (
            aggregatorLimit?.field &&
            aggregatorLimit?.value &&
            metrics.size >= aggregatorLimit.value
          ) {
            // @ts-ignore
            event[aggregatorLimit.field] = OVERFLOW_BUCKET_NAME;
            key = computeKey(event);

            // We need to make sure we get back the same set which was previously set with overflow count
            set = getMetricByKey(key);
            // @ts-ignore
            set._aggregator_overflow_count += 1;
          } else {
            // is grouping required
            if (group?.length) {
              let currentNode = groupedMetricsMap;

              for (let level = 0; level < group.length; level++) {
                const field = group[level].field;
                const limit = group[level].limit;

                // Check if current level is being untracked
                if (!currentNode.untracked) {
                  currentNode.untracked = new Map();
                }

                // Check if current level is being tracked
                if (!currentNode.tracked) {
                  currentNode.tracked = new Map();
                }

                // Check if the current field value exists in the tracked or untracked property
                // @ts-ignore
                const fieldValue = event[field];
                const trackedField = currentNode.tracked.get(fieldValue);
                const untrackedField = currentNode.untracked.get(fieldValue);

                // If current field value does not exist in the datastructure, add it to tracked based on size
                if (!trackedField && !untrackedField) {
                  // check for size of tracked
                  if (currentNode.tracked.size < limit) {
                    // Add to tracked
                    currentNode.tracked.set(fieldValue, {});
                    currentNode = currentNode.tracked.get(fieldValue) as TrackingMetricGroupMap;
                  } else {
                    // Reached limit for current level, add document to untracked
                    currentNode.untracked.set(fieldValue, {});
                    currentNode = currentNode.untracked.get(fieldValue) as TrackingMetricGroupMap;
                    // Once a parent has reached the limit, we must make all the subsequent children overflow

                    const remainingGroups = group.slice(level);
                    const remainingFields = remainingGroups.map((rGroup) => rGroup.field);
                    remainingFields.forEach((rField) => {
                      // @ts-ignore
                      event[rField] = OVERFLOW_BUCKET_NAME;
                    });
                    key = computeKey(event);
                    set = getMetricByKey(key);
                    // @ts-ignore
                    set._overflow_count[level] += 1;
                  }
                }

                // If current field value exists in the tracked property, go down a level
                if (trackedField) {
                  currentNode = trackedField;
                }

                // If current field value exists in the tracked property, go down a level
                if (untrackedField) {
                  currentNode = untrackedField;
                }
              }
            }
          }

          reduce(set, event);
          metrics.set(key, set);

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
