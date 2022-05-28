/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EntityArrayIterable } from '../lib/entity_iterable';
import { apm } from '../lib/apm';
import { timerange } from '../lib/timerange';
import { ApmFields } from '../lib/apm/apm_fields';

describe('DSL invocations', () => {
  let arrayIterable: EntityArrayIterable<ApmFields>;
  let eventsCopy: Array<Record<string, any>>;

  const range = timerange(
    new Date('2021-01-01T00:00:00.000Z'),
    new Date('2021-01-01T00:15:00.000Z')
  );
  const javaService = apm.service('opbeans-java', 'production', 'java');
  const javaInstance = javaService.instance('instance-1');
  let globalSeq = 0;

  const iterable = range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) =>
      javaInstance
        .transaction(`GET /api/product/${index}/${globalSeq++}`)
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
  const events = iterable.toArray();

  beforeEach(() => {
    eventsCopy = iterable.toArray();
    arrayIterable = new EntityArrayIterable(events);
  });
  it('to array on iterable reads to completion', () => {
    expect(events.length).toBe(15 * 2);
  });
  it('calling to array on SpanArrayIterable returns all events', () => {
    expect(arrayIterable.toArray().length).toBe(15 * 2);
  });
  it('calling toArray multiple times always sees all events', () => {
    expect(eventsCopy.length).toBe(15 * 2);
  });
  it('will yield the first peeked value', () => {
    expect(events[0]['transaction.name']).toBe('GET /api/product/0/0');
  });
  it('2nd invocation of toArray sees a new copy of generator invocation', () => {
    expect(eventsCopy[0]['transaction.name']).not.toBe('GET /api/product/0/0');
  });
  it('array iterable holds a copy and will yield the same items', () => {
    const copy = arrayIterable.toArray();
    expect(events[0]['transaction.name']).toBe(copy[0]['transaction.name']);
  });
});
