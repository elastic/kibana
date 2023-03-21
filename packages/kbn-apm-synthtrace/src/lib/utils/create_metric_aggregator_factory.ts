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

interface TrackingMetricGroupMap<TFields extends Fields> {
  tracked: Map<keyof TFields & string, TrackingMetricGroupMap<TFields>>;
  untracked: Map<keyof TFields & string, TrackingMetricGroupMap<TFields>>;
}

interface GroupFields<TFields extends Fields> {
  field: keyof TFields & string;
  limit: number;
}

export function createMetricAggregatorFactory<TFields extends Fields>() {
  return function <TMetric extends Record<string, any>, TOutput extends Record<string, any>>({
    filter,
    getAggregateKey,
    flushInterval,
    init,
    aggregatorLimit,
    grouping,
    reduce,
    serialize,
  }: {
    filter: (event: TFields) => boolean;
    getAggregateKey: (event: TFields) => string;
    flushInterval: string;
    init: (event: TFields) => TMetric;
    aggregatorLimit?: { field: Array<keyof TFields & string>; value: number };
    grouping?: GroupFields<TFields>[];
    reduce: (metric: TMetric, event: TFields) => void;
    serialize: (metric: TMetric) => TOutput;
  }) {
    let cb: (() => void) | undefined;

    const metrics: Map<string, TMetric & { '@timestamp'?: number }> = new Map();
    const groupedMetricsMap: TrackingMetricGroupMap<TFields> = {
      tracked: new Map(),
      untracked: new Map()
    };

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
          let metricsDocument = event;

          let overflow:{ field:string; index: number } | undefined;

          const hashes = [ key, ...(grouping?.map(group => appendHash('', String(event[group.field]))) ?? [])];

          for(let i = 0; i < hashes.length; i++) {
            const hash = hashes[i];
            const isTracked = groupedMetricsMap.tracked.has(hash);
            const isLast = i === hashes.length - 1;
            const isUntracked = groupedMetricsMap.untracked.has(hash);
            const isNew = !isTracked && !isUntracked;

            if (isLast) {



            } else {

            }

          }

          // Always check for Global aggregator Limit 1st
          if (aggregatorLimit?.value && metrics.size >= aggregatorLimit.value) {
            // We update the event with soem unique values,
            // Generate the key
            // get the set from metric based in this key
            // Increase the _overflow_count on the set object
            // Reset the set inside metrics
            overflow = { field: 'service.name', index: -1 };
          } else if (grouping?.length) {

            let mapForCurrentGroup = groupedMetricsMap;

            for(let i = 0; i < grouping.length; i++) {
              const { field, limit } = grouping[i];
              const { tracked, untracked } = mapForCurrentGroup;

              const fieldValue = event[field];

              const isTracked = tracked.has(fieldValue);
              const isUntracked = untracked.has(fieldValue);

              const isNew = !isTracked && !isUntracked;

              const canTrack = tracked.size >= limit;

              if (!isNew) {
                mapForCurrentGroup = isTracked ? tracked;
              }

              // If current field value does not exist in the datastructure, add it to tracked based on size
              if (tracked.size >= limit) {
                // Reached limit for current level, add document to untracked
                untracked.set(fieldValue, { tracked: new Map(), untracked: new Map() });
                overflow = { field, index: i };
                break;
              } else if (isNew) {
                tracked.set(fieldValue
              }


            }

            for (let level = 0; level < group.length; level++) {

              const isNew = !trackedField && !untrackedField;
              // If current field value does not exist in the datastructure, add it to tracked based on size
              if (isNew && currentNode.tracked.size >= limit) {
                // Reached limit for current level, add document to untracked
                currentNode.untracked.set(fieldValue, {});
                currentNode = currentNode.untracked.get(fieldValue) as TrackingMetricGroupMap;

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

                  metricsDocument = {};

                  const remainingGroups = group.slice(level);
                  const remainingFields = remainingGroups.map((rGroup) => rGroup.field);
                  remainingFields.forEach((rField) => {
                    // @ts-ignore
                    metricsDocument[rField] = OVERFLOW_BUCKET_NAME;
                  });
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

          let set = getMetricByKey(key);

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
