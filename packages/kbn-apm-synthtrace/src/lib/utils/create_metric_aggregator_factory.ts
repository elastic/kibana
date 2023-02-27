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
import { ScenarioOptions } from '../../cli/scenario';

interface ServiceMapValue {
  transactionCount: number;
  overflowKey: string | null;
}

export function createMetricAggregatorFactory<TFields extends Fields>() {
  return function <TMetric extends Record<string, any>, TOutput extends Record<string, any>>(
    {
      filter,
      getAggregateKey,
      init,
      flushInterval,
      metricName,
    }: {
      filter: (event: TFields) => boolean;
      getAggregateKey: (event: TFields) => string;
      init: (event: TFields) => TMetric;
      flushInterval: string;
      metricName: string;
    },
    reduce: (metric: TMetric, event: TFields) => void,
    serialize: (metric: TMetric) => TOutput,
    scenarioOptions?: ScenarioOptions
  ) {
    let cb: (() => void) | undefined;

    const { max_transactions = 10_000, max_services = 10_000 } = scenarioOptions || {};

    const metrics: Map<string, TMetric & { '@timestamp'?: number }> = new Map();
    const serviceListMap: Map<string, ServiceMapValue> = new Map();
    let serviceOverflowKey: string | null = null;

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
        function generateTransactionMetric(service: ServiceMapValue) {
          const isTransactionCountOverflown = service.transactionCount >= max_transactions;

          const truncatedTimestamp = Math.floor(timestamp / flushEveryMs) * flushEveryMs;
          const key =
            service.overflowKey ||
            appendHash(getAggregateKey(event), truncatedTimestamp.toString());

          let set = metrics.get(key);

          if (!set) {
            set = init({ ...event });
            set['@timestamp'] = truncatedTimestamp;
          }

          if (isTransactionCountOverflown) {
            // To handle 1st time key creation logic
            service.overflowKey = key;

            // @ts-ignore
            set['transaction.name'] = OVERFLOW_BUCKET_NAME;
            // @ts-ignore
            set['transaction.aggregation.overflow_count'] += 1;
          }
          service.transactionCount += 1;

          metrics.set(key, set);
          reduce(set, event);
          callback();
        }

        function writeTransactionMetric() {
          // @ts-ignore
          const existingService = serviceListMap.get(event['service.name']);
          if (existingService) {
            generateTransactionMetric(existingService);
          } else {
            const newService: ServiceMapValue = {
              transactionCount: 0,
              overflowKey: null,
            };
            // @ts-ignore
            serviceListMap.set(event['service.name'], newService);
            generateTransactionMetric(newService);
          }
        }

        function writeServiceMetrics(shouldTrackOverflowCount: boolean = false) {
          // @ts-ignore
          const existingService = serviceListMap.get(event['service.name']);
          const hasServiceBucketOverflown = serviceListMap.size >= max_services;
          const truncatedTimestamp = Math.floor(timestamp / flushEveryMs) * flushEveryMs;
          const key =
            serviceOverflowKey || appendHash(getAggregateKey(event), truncatedTimestamp.toString());

          let set = metrics.get(key);

          if (!set) {
            set = init({ ...event });
            set['@timestamp'] = truncatedTimestamp;
          }

          if (!existingService) {
            if (hasServiceBucketOverflown) {
              // To handle 1st time key creation logic
              serviceOverflowKey = key;

              // @ts-ignore
              set['service.name'] = OVERFLOW_BUCKET_NAME;
              if (shouldTrackOverflowCount) {
                // @ts-ignore
                set['service_transaction.aggregation.overflow_count'] += 1;
              }
            }

            const newService: ServiceMapValue = {
              transactionCount: 0,
              overflowKey: null,
            };
            serviceListMap.set(set['service.name'], newService);
          }

          metrics.set(key, set);
          reduce(set, event);
          callback();
        }

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

        function setMetric() {
          switch (metricName) {
            case 'transaction':
              writeTransactionMetric();
              break;
            case 'service_summary':
              writeServiceMetrics();
              break;
            case 'service_transaction':
              writeServiceMetrics(true);
              break;
            default:
              writeMetric();
          }
        }

        if (timestamp > nextFlush) {
          nextFlush = getNextFlush(timestamp);
          flush(this, true, setMetric);
        } else {
          setMetric();
        }
      },
    });
  };
}
