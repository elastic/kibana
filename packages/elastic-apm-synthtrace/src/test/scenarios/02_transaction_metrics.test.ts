/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm } from '../../lib/apm';
import { timerange } from '../../lib/timerange';
import { getTransactionMetrics } from '../../lib/apm/processors/get_transaction_metrics';
import { StreamProcessor } from '../../lib/stream_processor';
import { ApmFields } from '../../lib/apm/apm_fields';

describe('transaction metrics', () => {
  let events: Array<Record<string, any>>;

  beforeEach(() => {
    const javaService = apm.service('opbeans-java', 'production', 'java');
    const javaInstance = javaService.instance('instance-1');

    const range = timerange(
      new Date('2021-01-01T00:00:00.000Z'),
      new Date('2021-01-01T00:15:00.000Z')
    );

    const span = (timestamp: number) =>
      javaInstance.transaction('GET /api/product/list').duration(1000).timestamp(timestamp);

    const processor = new StreamProcessor<ApmFields>({
      processors: [getTransactionMetrics],
      flushInterval: '15m',
    });
    events = processor
      .streamToArray(
        range
          .interval('1m')
          .rate(25)
          .generator((timestamp) => span(timestamp).success()),
        range
          .interval('1m')
          .rate(50)
          .generator((timestamp) => span(timestamp).failure())
      )
      .filter((fields) => fields['metricset.name'] === 'transaction');
  });

  it('generates the right amount of transaction metrics', () => {
    expect(events.length).toBe(30);
  });

  it('generates a metricset per interval', () => {
    const metricsSetsForSuccessfulTransactions = events.filter(
      (event) => event['event.outcome'] === 'success'
    );

    const [first, second] = metricsSetsForSuccessfulTransactions.map((event) =>
      new Date(event['@timestamp']).toISOString()
    );

    expect([first, second]).toEqual(['2021-01-01T00:00:00.000Z', '2021-01-01T00:01:00.000Z']);
  });

  it('generates a metricset per value of event.outcome', () => {
    const metricsSetsForSuccessfulTransactions = events.filter(
      (event) => event['event.outcome'] === 'success'
    );

    const metricsSetsForFailedTransactions = events.filter(
      (event) => event['event.outcome'] === 'failure'
    );

    expect(metricsSetsForSuccessfulTransactions.length).toBe(15);
    expect(metricsSetsForFailedTransactions.length).toBe(15);
  });

  it('captures all the values from aggregated transactions', () => {
    const metricsSetsForSuccessfulTransactions = events.filter(
      (event) => event['event.outcome'] === 'success'
    );

    const metricsSetsForFailedTransactions = events.filter(
      (event) => event['event.outcome'] === 'failure'
    );

    expect(metricsSetsForSuccessfulTransactions.length).toBe(15);

    metricsSetsForSuccessfulTransactions.forEach((event) => {
      expect(event['transaction.duration.histogram']).toEqual({
        values: [1000000],
        counts: [25],
      });
    });

    metricsSetsForFailedTransactions.forEach((event) => {
      expect(event['transaction.duration.histogram']).toEqual({
        values: [1000000],
        counts: [50],
      });
    });
  });
});
