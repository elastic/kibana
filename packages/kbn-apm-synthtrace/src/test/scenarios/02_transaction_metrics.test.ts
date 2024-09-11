/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm, timerange, ApmFields } from '@kbn/apm-synthtrace-client';
import { sortBy } from 'lodash';
import { Readable } from 'stream';
import { createTransactionMetricsAggregator } from '../../lib/apm/aggregators/create_transaction_metrics_aggregator';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';

describe('transaction metrics', () => {
  let events: Array<Record<string, any>>;

  beforeEach(async () => {
    const javaService = apm.service({
      name: 'opbeans-java',
      environment: 'production',
      agentName: 'java',
    });
    const javaInstance = javaService.instance('instance-1');

    const range = timerange(
      new Date('2021-01-01T00:00:00.000Z'),
      new Date('2021-01-01T00:15:00.000Z')
    );

    const span = (timestamp: number) =>
      javaInstance
        .transaction({ transactionName: 'GET /api/product/list' })
        .duration(1000)
        .timestamp(timestamp);

    const serialized = [
      ...Array.from(
        range
          .interval('1m')
          .rate(25)
          .generator((timestamp) => span(timestamp).success())
      ),
      ...Array.from(
        range
          .interval('1m')
          .rate(50)
          .generator((timestamp) => span(timestamp).failure())
      ),
    ].flatMap((event) => event.serialize());

    events = (
      await awaitStream<ApmFields>(
        Readable.from(sortBy(serialized, '@timestamp')).pipe(
          createTransactionMetricsAggregator('1m')
        )
      )
    ).filter((field) => field['metricset.name'] === 'transaction');
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
