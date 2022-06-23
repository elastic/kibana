/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy } from 'lodash';
import { ApmFields } from '../apm_fields';
import { aggregate } from '../utils/aggregate';

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
        ['transaction.root']: transaction['parent.id'] === undefined,
      };
    });

  const metricsets = aggregate(transactions, [
    'trace.root',
    'transaction.root',
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
    'cloud.account.id',
    'cloud.account.name',
    'cloud.machine.type',
    'cloud.project.id',
    'cloud.project.name',
    'cloud.service.name',
    'service.language.name',
    'service.language.version',
    'service.runtime.name',
    'service.runtime.version',
    'host.os.platform',
    'faas.id',
    'faas.coldstart',
    'faas.trigger.type',
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
