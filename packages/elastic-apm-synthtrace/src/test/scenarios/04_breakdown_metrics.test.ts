/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { sumBy } from 'lodash';
import { Fields } from '../../lib/entity';
import { service } from '../../lib/service';
import { timerange } from '../../lib/timerange';
import { getBreakdownMetrics } from '../../lib/utils/get_breakdown_metrics';

describe('breakdown metrics', () => {
  let events: Fields[];

  const LIST_RATE = 2;
  const LIST_SPANS = 2;
  const ID_RATE = 4;
  const ID_SPANS = 2;
  const INTERVALS = 6;

  beforeEach(() => {
    const javaService = service('opbeans-java', 'production', 'java');
    const javaInstance = javaService.instance('instance-1');

    const start = new Date('2021-01-01T00:00:00.000Z').getTime();

    const range = timerange(start, start + INTERVALS * 30 * 1000);

    events = getBreakdownMetrics([
      ...range
        .interval('30s')
        .rate(LIST_RATE)
        .flatMap((timestamp) =>
          javaInstance
            .transaction('GET /api/product/list')
            .timestamp(timestamp)
            .duration(1000)
            .children(
              javaInstance
                .span('GET apm-*/_search', 'db', 'elasticsearch')
                .timestamp(timestamp + 150)
                .duration(500),
              javaInstance.span('GET foo', 'db', 'redis').timestamp(timestamp).duration(100)
            )
            .serialize()
        ),
      ...range
        .interval('30s')
        .rate(ID_RATE)
        .flatMap((timestamp) =>
          javaInstance
            .transaction('GET /api/product/:id')
            .timestamp(timestamp)
            .duration(1000)
            .children(
              javaInstance
                .span('GET apm-*/_search', 'db', 'elasticsearch')
                .duration(500)
                .timestamp(timestamp + 100)
                .children(
                  javaInstance
                    .span('bar', 'external', 'http')
                    .timestamp(timestamp + 200)
                    .duration(100)
                )
            )
            .serialize()
        ),
    ]).filter((event) => event['processor.event'] === 'metric');
  });

  it('generates the right amount of breakdown metrics', () => {
    expect(events.length).toBe(INTERVALS * (LIST_SPANS + 1 + ID_SPANS + 1));
  });

  it('calculates breakdown metrics for the right amount of transactions and spans', () => {
    expect(sumBy(events, (event) => event['span.self_time.count']!)).toBe(
      INTERVALS * LIST_RATE * (LIST_SPANS + 1) + INTERVALS * ID_RATE * (ID_SPANS + 1)
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
      expectedCountFromListTransaction * 500 * 1000 + expectedCountFromIdTransaction * 400 * 1000
    );
  });
});
