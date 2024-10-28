/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sumBy } from 'lodash';
import { Readable } from 'stream';
import { awaitStream } from '../../lib/utils/wait_until_stream_finished';
import { createBreakdownMetricsAggregator } from '../../lib/apm/aggregators/create_breakdown_metrics_aggregator';
import { apm, ApmFields, timerange } from '@kbn/apm-synthtrace-client';

describe('breakdown metrics', () => {
  let events: ApmFields[];

  const LIST_RATE = 1;
  const LIST_SPANS = 2;
  const ID_RATE = 4;
  const ID_SPANS = 2;
  const INTERVALS = 6;

  beforeEach(async () => {
    const javaService = apm.service({
      name: 'opbeans-java',
      environment: 'production',
      agentName: 'java',
    });
    const javaInstance = javaService.instance('instance-1');

    const start = new Date('2021-01-01T00:00:00.000Z');

    const range = timerange(start, new Date(start.getTime() + INTERVALS * 30 * 1000));

    const listSpans = Array.from(
      range
        .interval('30s')
        .rate(LIST_RATE)
        .generator((timestamp) =>
          javaInstance
            .transaction({ transactionName: 'GET /api/product/list' })
            .timestamp(timestamp)
            .duration(1000)
            .children(
              javaInstance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .timestamp(timestamp + 150)
                .duration(500),
              javaInstance
                .span({ spanName: 'GET foo', spanType: 'db', spanSubtype: 'redis' })
                .timestamp(timestamp)
                .duration(100)
            )
        )
    );

    const productPageSpans = Array.from(
      range
        .interval('30s')
        .rate(ID_RATE)
        .generator((timestamp) =>
          javaInstance
            .transaction({ transactionName: 'GET /api/product/:id' })
            .timestamp(timestamp)
            .duration(1000)
            .children(
              javaInstance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(500)
                .timestamp(timestamp + 100)
                .children(
                  javaInstance
                    .span({ spanName: 'bar', spanType: 'external', spanSubtype: 'http' })
                    .timestamp(timestamp + 200)
                    .duration(100)
                )
            )
        )
    );

    const serializedEvents = listSpans
      .concat(productPageSpans)
      .flatMap((event) => event.serialize());

    const stream = Readable.from(serializedEvents).pipe(createBreakdownMetricsAggregator('30s'));

    const allEvents = await awaitStream<ApmFields>(stream);

    events = allEvents.filter((event) => event['metricset.name'] === 'span_breakdown');
  });

  it('generates the right amount of breakdown metrics', () => {
    expect(events.length).toBe(INTERVALS * (LIST_SPANS + 1 + ID_SPANS));
  });

  it('does not generate breakdown metrics for the "bar" span that is never active', () => {
    expect(events.filter((event) => event['span.subtype'] === 'http').length).toBe(0);
  });

  it('calculates breakdown metrics for the right amount of transactions and spans', () => {
    expect(sumBy(events, (event) => event['span.self_time.count']!)).toBe(
      INTERVALS * LIST_RATE * (LIST_SPANS + 1) + INTERVALS * ID_RATE * ID_SPANS
    );
  });

  it('generates app metricsets for transaction self time', () => {
    expect(events.some((event) => event['span.type'] === 'app' && !event['span.subtype'])).toBe(
      true
    );
  });

  it('generates the right statistic', () => {
    const elasticsearchSets = events.filter((event) => event['span.subtype'] === 'elasticsearch');

    const expectedCountFromListTransaction = INTERVALS * LIST_RATE;

    const expectedCountFromIdTransaction = INTERVALS * ID_RATE;

    const expectedCount = expectedCountFromIdTransaction + expectedCountFromListTransaction;

    expect(sumBy(elasticsearchSets, (set) => set['span.self_time.count']!)).toBe(expectedCount);

    expect(sumBy(elasticsearchSets, (set) => set['span.self_time.sum.us']!)).toBe(
      expectedCountFromListTransaction * 500 * 1000 + expectedCountFromIdTransaction * 500 * 1000
    );
  });
});
