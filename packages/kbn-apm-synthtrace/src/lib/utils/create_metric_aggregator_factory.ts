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

export function createMetricAggregatorFactory<TFields extends Fields>() {
  return function <TMetric extends Record<string, any>, TOutput extends Record<string, any>>(
    {
      filter,
      getAggregateKey,
      init,
      flushInterval,
    }: {
      filter: (event: TFields) => boolean;
      getAggregateKey: (event: TFields) => string;
      init: (event: TFields) => TMetric;
      flushInterval: string;
    },
    reduce: (metric: TMetric, event: TFields) => void,
    serialize: (metric: TMetric) => TOutput
  ) {
    let cb: (() => void) | undefined;

    const metrics: Map<string, TMetric & { '@timestamp'?: number }> = new Map();

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

        function writeMetric() {
          const truncatedTimestamp = Math.floor(timestamp / flushEveryMs) * flushEveryMs;

          const key = appendHash(getAggregateKey(event), truncatedTimestamp.toString());

          let set = metrics.get(key);

          if (!set) {
            set = init({ ...event });
            set['@timestamp'] = truncatedTimestamp;
            metrics.set(key, set);
          }

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
