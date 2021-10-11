/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick, sortBy } from 'lodash';
import moment from 'moment';
import objectHash from 'object-hash';
import { Fields } from '../entity';

function sortAndCompressHistogram(histogram?: { values: number[]; counts: number[] }) {
  return sortBy(histogram?.values).reduce(
    (prev, current) => {
      const lastValue = prev.values[prev.values.length - 1];
      if (lastValue === current) {
        prev.counts[prev.counts.length - 1]++;
        return prev;
      }

      prev.counts.push(1);
      prev.values.push(current);

      return prev;
    },
    { values: [] as number[], counts: [] as number[] }
  );
}

export function getTransactionMetrics(events: Fields[]) {
  const transactions = events.filter((event) => event['processor.event'] === 'transaction');

  const metricsets = new Map<string, Fields>();

  function getTransactionBucketKey(transaction: Fields) {
    return {
      '@timestamp': moment(transaction['@timestamp']).startOf('minute').valueOf(),
      'trace.root': transaction['parent.id'] === undefined,
      ...pick(transaction, [
        'transaction.name',
        'transaction.type',
        'event.outcome',
        'transaction.result',
        'agent.name',
        'service.environment',
        'service.name',
        'service.version',
        'host.name',
        'container.id',
        'kubernetes.pod.name',
      ]),
    };
  }

  for (const transaction of transactions) {
    const key = getTransactionBucketKey(transaction);
    const id = objectHash(key);
    let metricset = metricsets.get(id);
    if (!metricset) {
      metricset = {
        ...key,
        ['processor.event']: 'metric',
        'transaction.duration.histogram': {
          values: [],
          counts: [],
        },
      };
      metricsets.set(id, metricset);
    }
    metricset['transaction.duration.histogram']?.counts.push(1);
    metricset['transaction.duration.histogram']?.values.push(
      Number(transaction['transaction.duration.us'])
    );
  }

  return [
    ...Array.from(metricsets.values()).map((metricset) => {
      return {
        ...metricset,
        ['transaction.duration.histogram']: sortAndCompressHistogram(
          metricset['transaction.duration.histogram']
        ),
        _doc_count: metricset['transaction.duration.histogram']!.values.length,
      };
    }),
  ];
}
