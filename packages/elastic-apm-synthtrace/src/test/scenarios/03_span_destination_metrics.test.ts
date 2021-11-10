/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { service } from '../../lib/service';
import { timerange } from '../../lib/timerange';
import { getSpanDestinationMetrics } from '../../lib/utils/get_span_destination_metrics';

describe('span destination metrics', () => {
  let events: Array<Record<string, any>>;

  beforeEach(() => {
    const javaService = service('opbeans-java', 'production', 'java');
    const javaInstance = javaService.instance('instance-1');

    const range = timerange(
      new Date('2021-01-01T00:00:00.000Z').getTime(),
      new Date('2021-01-01T00:15:00.000Z').getTime()
    );

    events = getSpanDestinationMetrics(
      range
        .interval('1m')
        .rate(25)
        .flatMap((timestamp) =>
          javaInstance
            .transaction('GET /api/product/list')
            .duration(1000)
            .success()
            .timestamp(timestamp)
            .children(
              javaInstance
                .span('GET apm-*/_search', 'db', 'elasticsearch')
                .timestamp(timestamp)
                .duration(1000)
                .destination('elasticsearch')
                .success()
            )
            .serialize()
        )
        .concat(
          range
            .interval('1m')
            .rate(50)
            .flatMap((timestamp) =>
              javaInstance
                .transaction('GET /api/product/list')
                .duration(1000)
                .failure()
                .timestamp(timestamp)
                .children(
                  javaInstance
                    .span('GET apm-*/_search', 'db', 'elasticsearch')
                    .timestamp(timestamp)
                    .duration(1000)
                    .destination('elasticsearch')
                    .failure(),
                  javaInstance
                    .span('custom_operation', 'app')
                    .timestamp(timestamp)
                    .duration(500)
                    .success()
                )
                .serialize()
            )
        )
    );
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
