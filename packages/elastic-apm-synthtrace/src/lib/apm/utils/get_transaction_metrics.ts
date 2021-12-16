/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy } from 'lodash';
import { ApmFields } from '../apm_fields';
import { aggregate } from './aggregate';

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

export function getTransactionMetrics(events: ApmFields[]) {
  const transactions = events
    .filter((event) => event['processor.event'] === 'transaction')
    .map((transaction) => {
      return {
        ...transaction,
        ['trace.root']: transaction['parent.id'] === undefined,
      };
    });

  const metricsets = aggregate(transactions, [
    'trace.root',
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
  ]);

  return metricsets.map((metricset) => {
    const histogram = {
      values: [] as number[],
      counts: [] as number[],
    };

    for (const transaction of metricset.events) {
      histogram.counts.push(1);
      histogram.values.push(Number(transaction['transaction.duration.us']));
    }

    return {
      ...metricset.key,
      'metricset.name': 'transaction',
      'transaction.duration.histogram': sortAndCompressHistogram(histogram),
      _doc_count: metricset.events.length,
    };
  });
}
