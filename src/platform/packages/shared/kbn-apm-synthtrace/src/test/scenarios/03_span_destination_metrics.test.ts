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
import { createSpanMetricsAggregator } from '../../lib/apm/aggregators/create_span_metrics_aggregator';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';

describe('span destination metrics', () => {
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

    const serialized = [
      ...Array.from(
        range
          .interval('1m')
          .rate(25)
          .generator((timestamp) =>
            javaInstance
              .transaction({ transactionName: 'GET /api/product/list' })
              .duration(1000)
              .success()
              .timestamp(timestamp)
              .children(
                javaInstance
                  .span({
                    spanName: 'GET apm-*/_search',
                    spanType: 'db',
                    spanSubtype: 'elasticsearch',
                  })
                  .timestamp(timestamp)
                  .duration(1000)
                  .destination('elasticsearch')
                  .success()
              )
          )
      ),
      ...Array.from(
        range
          .interval('1m')
          .rate(50)
          .generator((timestamp) =>
            javaInstance
              .transaction({ transactionName: 'GET /api/product/list' })
              .duration(1000)
              .failure()
              .timestamp(timestamp)
              .children(
                javaInstance
                  .span({
                    spanName: 'GET apm-*/_search',
                    spanType: 'db',
                    spanSubtype: 'elasticsearch',
                  })
                  .timestamp(timestamp)
                  .duration(1000)
                  .destination('elasticsearch')
                  .failure(),
                javaInstance
                  .span({ spanName: 'custom_operation', spanType: 'app' })
                  .timestamp(timestamp)
                  .duration(500)
                  .success()
              )
          )
      ),
    ].flatMap((event) => event.serialize());

    events = (
      await awaitStream<ApmFields>(
        Readable.from(sortBy(serialized, '@timestamp')).pipe(createSpanMetricsAggregator('1m'))
      )
    ).filter((fields) => fields['metricset.name'] === 'service_destination');
  });

  it('generates the right amount of span metrics', () => {
    expect(events.length).toBe(30);
  });

  it('does not generate metricsets for non-exit spans', () => {
    expect(
      events.every((event) => event['span.destination.service.resource'] === 'elasticsearch')
    ).toBe(true);
  });

  it('captures all the values from aggregated exit spans', () => {
    const metricsSetsForSuccessfulExitSpans = events.filter(
      (event) => event['event.outcome'] === 'success'
    );

    const metricsSetsForFailedExitSpans = events.filter(
      (event) => event['event.outcome'] === 'failure'
    );

    expect(metricsSetsForSuccessfulExitSpans.length).toBe(15);

    metricsSetsForSuccessfulExitSpans.forEach((event) => {
      expect(event['span.destination.service.response_time.count']).toEqual(25);
      expect(event['span.destination.service.response_time.sum.us']).toEqual(25000000);
    });

    metricsSetsForFailedExitSpans.forEach((event) => {
      expect(event['span.destination.service.response_time.count']).toEqual(50);
      expect(event['span.destination.service.response_time.sum.us']).toEqual(50000000);
    });
  });
});
