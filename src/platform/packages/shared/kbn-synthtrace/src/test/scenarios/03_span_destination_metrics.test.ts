/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { sortBy } from 'lodash';
import { Readable } from 'stream';
import {
  createSpanMetricsAggregator,
  SPANS_PER_DESTINATION_METRIC,
} from '../../lib/apm/aggregators/create_span_metrics_aggregator';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';
import type { ToolingLog } from '@kbn/tooling-log';

// Test parameters
const SUCCESSFUL_RATE = 25;
const FAILED_RATE = 50;
const SUCCESSFUL_SPAN_DURATION = 1000;
const FAILED_SPAN_DURATION = 500;

// Expected values
const SUCCESSFUL_TOTAL_COUNT = SUCCESSFUL_RATE * SPANS_PER_DESTINATION_METRIC;
const FAILED_TOTAL_COUNT = FAILED_RATE * SPANS_PER_DESTINATION_METRIC;
const SUCCESSFUL_TOTAL_DURATION = SUCCESSFUL_TOTAL_COUNT * SUCCESSFUL_SPAN_DURATION * 1000;
const FAILED_TOTAL_DURATION = FAILED_TOTAL_COUNT * FAILED_SPAN_DURATION * 1000;

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
      new Date('2021-01-01T00:15:00.000Z'),
      {} as ToolingLog
    );

    const serialized = [
      ...Array.from(
        range
          .interval('1m')
          .rate(SUCCESSFUL_RATE)
          .generator((timestamp) =>
            javaInstance
              .transaction({ transactionName: 'GET /api/product/list' })
              .duration(SUCCESSFUL_TOTAL_DURATION)
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
                  .duration(SUCCESSFUL_SPAN_DURATION)
                  .destination('elasticsearch')
                  .success()
              )
          )
      ),
      ...Array.from(
        range
          .interval('1m')
          .rate(FAILED_RATE)
          .generator((timestamp) =>
            javaInstance
              .transaction({ transactionName: 'GET /api/product/list' })
              .duration(SUCCESSFUL_SPAN_DURATION + FAILED_SPAN_DURATION)
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
                  .duration(FAILED_SPAN_DURATION)
                  .destination('elasticsearch')
                  .failure(),
                javaInstance
                  .span({ spanName: 'custom_operation', spanType: 'app' })
                  .timestamp(timestamp)
                  .duration(SUCCESSFUL_SPAN_DURATION)
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
      expect(event['span.destination.service.response_time.count']).toEqual(SUCCESSFUL_TOTAL_COUNT);
      expect(event['span.destination.service.response_time.sum.us']).toEqual(
        SUCCESSFUL_TOTAL_DURATION
      );
    });

    metricsSetsForFailedExitSpans.forEach((event) => {
      expect(event['span.destination.service.response_time.count']).toEqual(FAILED_TOTAL_COUNT);
      expect(event['span.destination.service.response_time.sum.us']).toEqual(FAILED_TOTAL_DURATION);
    });
  });
});
