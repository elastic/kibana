/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EntityArrayIterable, EntityIterable } from '../lib/entity_iterable';
import { apm } from '../lib/apm';
import { timerange } from '../lib/timerange';
import { ApmFields } from '../lib/apm/apm_fields';

const range = timerange(new Date('2021-01-01T00:00:00.000Z'), new Date('2021-01-01T00:15:00.000Z'));

describe('rate per minute calculations', () => {
  let iterable: EntityIterable<ApmFields>;
  let arrayIterable: EntityArrayIterable<ApmFields>;
  let events: Array<Record<string, any>>;

  beforeEach(() => {
    const javaService = apm.service({
      name: 'opbeans-java',
      environment: 'production',
      agentName: 'java',
    });
    const javaInstance = javaService.instance('instance-1');

    iterable = range
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        javaInstance
          .transaction({ transactionName: 'GET /api/product/list' })
          .duration(1000)
          .success()
          .timestamp(timestamp)
          .children(
            javaInstance
              .span({ spanName: 'GET apm-*/_search', spanType: 'db', spanSubtype: 'elasticsearch' })
              .success()
              .duration(900)
              .timestamp(timestamp + 50)
          )
      );
    events = iterable.toArray();
    arrayIterable = new EntityArrayIterable(events);
  });

  it('array iterable returns exact rate per minute', () => {
    expect(arrayIterable.estimatedRatePerMinute()).toEqual(2);
  });
  it('iterable returns rate per minute approximation', () => {
    expect(iterable.estimatedRatePerMinute()).toEqual(2);
  });
  it('iterable returns same rate as materialized iterable', () => {
    expect(iterable.estimatedRatePerMinute()).toEqual(arrayIterable.estimatedRatePerMinute());
  });
});

describe('estimatedRatePerMinute', () => {
  it('interval of 3 per minute returns 3', () => {
    expect(range.interval('1m').rate(3).estimatedRatePerMinute()).toEqual(3);
  });

  it('interval of 6 per 5 minutes returns 6/5', () => {
    expect(range.interval('5m').rate(6).estimatedRatePerMinute()).toEqual(6 / 5);
  });

  it('interval of 6 per 30 minutes returns 6/30', () => {
    expect(range.interval('30m').rate(6).estimatedRatePerMinute()).toEqual(6 / 30);
  });

  it('interval of 3 per second returns 60 * 3', () => {
    expect(range.interval('1s').rate(3).estimatedRatePerMinute()).toEqual(60 * 3);
  });

  it('ratePerMinute of 180 returns 180', () => {
    expect(range.ratePerMinute(180).estimatedRatePerMinute()).toEqual(180);
  });

  it('ratePerMinute of 1 returns 1', () => {
    expect(range.ratePerMinute(1).estimatedRatePerMinute()).toEqual(1);
  });

  it('ratePerMinute of 61 returns 61', () => {
    expect(range.ratePerMinute(61).estimatedRatePerMinute()).toEqual(61);
  });
});
