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

describe('rate per minute calculations', () => {
  let iterable: EntityIterable<ApmFields>;
  let arrayIterable: EntityArrayIterable<ApmFields>;
  let events: Array<Record<string, any>>;

  const range = timerange(
    new Date('2021-01-01T00:00:00.000Z'),
    new Date('2021-01-01T00:15:00.000Z')
  );

  const i1r3 = range.interval('1m').rate(3);
  const i5r6 = range.interval('5m').rate(6);
  const i30r6 = range.interval('30m').rate(6);
  const i1sr3 = range.interval('1s').rate(3);

  beforeEach(() => {
    const javaService = apm.service('opbeans-java', 'production', 'java');
    const javaInstance = javaService.instance('instance-1');

    iterable = range
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        javaInstance
          .transaction('GET /api/product/list')
          .duration(1000)
          .success()
          .timestamp(timestamp)
          .children(
            javaInstance
              .span('GET apm-*/_search', 'db', 'elasticsearch')
              .success()
              .duration(900)
              .timestamp(timestamp + 50)
          )
      );
    events = iterable.toArray();
    arrayIterable = new EntityArrayIterable(events);
  });
  it('array iterable returns exact rate per minute', () => {
    expect(arrayIterable.ratePerMinute()).toEqual(2);
  });
  it('iterable returns rate per minute approximation', () => {
    expect(iterable.ratePerMinute()).toEqual(2);
  });
  it('iterable returns same rate as materialized iterable', () => {
    expect(iterable.ratePerMinute()).toEqual(arrayIterable.ratePerMinute());
  });

  it('interval of 3 per minute returns 3', () => {
    expect(i1r3.ratePerMinute()).toEqual(3);
  });
  it('interval of 6 per 5 minutes returns 6/5', () => {
    expect(i5r6.ratePerMinute()).toEqual(6 / 5);
  });
  it('interval of 6 per 30 minutes returns 6/30', () => {
    expect(i30r6.ratePerMinute()).toEqual(6 / 30);
  });
  it('interval of 3 per second returns 60 * 3', () => {
    expect(i1sr3.ratePerMinute()).toEqual(60 * 3);
  });
});
