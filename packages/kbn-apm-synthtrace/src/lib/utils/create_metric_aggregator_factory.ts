/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { Duplex, Transform } from 'stream';
import { Fields } from '../entity';
import { parseInterval } from '../interval';
import { appendHash } from './hash';

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

    const flushEveryMs = moment.duration(intervalAmount, intervalUnit).asMilliseconds();

    let nextFlush: number | null = null;

    let toFlush: TMetric[] = [];

    function flush(stream: Duplex, includeCurrentMetrics: boolean, minSize: number = 0) {
      const allItems = [...toFlush];

      toFlush = [];

      if (includeCurrentMetrics) {
        allItems.push(...metrics.values());
        metrics.clear();
      }

      let flushed = 0;

      while (allItems.length) {
        const next = allItems.shift()!;
        const shouldWriteNext = stream.push(serialize(next));
        flushed++;
        if (!shouldWriteNext && minSize <= flushed) {
          toFlush = allItems;
          return;
        }
      }

      if (cb) {
        const next = cb;
        cb = undefined;
        next();
      }
    }

    function getNextFlush(timestamp: number) {
      return Math.ceil((timestamp + 1) / flushEveryMs) * flushEveryMs;
    }

    return new Transform({
      objectMode: true,
      read(size) {
        flush(this, false, size);
      },
      final(callback) {
        flush(this, true);
        callback();
      },
      write(event: TFields, encoding, callback) {
        if (cb) {
          throw new Error('Writing to a paused stream');
        }
        if (!filter(event)) {
          callback();
          return;
        }

        const timestamp = event['@timestamp']!;

        if (typeof timestamp === 'string') {
          throw new Error('Timestamp cannot be a string');
        }

        const truncatedTimestamp = Math.floor(timestamp / flushEveryMs) * flushEveryMs;
        const key = appendHash(getAggregateKey(event), truncatedTimestamp.toString());

        let set = metrics.get(key);

        if (!set) {
          set = init({ ...event });
          set['@timestamp'] = truncatedTimestamp;
          metrics.set(key, set);
        }

        reduce(set, event);

        if (nextFlush === null) {
          nextFlush = getNextFlush(timestamp);
        }

        if (timestamp > nextFlush) {
          nextFlush = getNextFlush(timestamp);
          cb = callback;
          flush(this, true);
        } else {
          callback();
        }
      },
    });
  };
}
