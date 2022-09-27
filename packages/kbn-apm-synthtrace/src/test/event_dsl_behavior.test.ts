/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SignalArray } from '../lib/streaming/signal_iterable';
import { apm } from '../lib/apm';
import { timerange } from '../dsl/timerange';
import { ApmFields } from '../dsl/apm/apm_fields';

describe('DSL invocations', () => {
  let signalsArray: SignalArray<ApmFields>;
  let iterableToArray: Array<Record<string, any>>;

  const range = timerange(
    new Date('2021-01-01T00:00:00.000Z'),
    new Date('2021-01-01T00:15:00.000Z')
  );
  const javaService = apm.service({
    name: 'opbeans-java',
    environment: 'production',
    agentName: 'java',
  });
  const javaInstance = javaService.instance('instance-1');
  let globalSeq = 0;

  const iterable = range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) =>
      javaInstance
        .transaction({ transactionName: `GET /api/product/${index}/${globalSeq++}` })
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
  const signals = iterable.toArray();

  beforeEach(() => {
    iterableToArray = iterable.toArray();
    signalsArray = new SignalArray(signals);
  });
  it('to array on iterable reads to completion', () => {
    expect(signals.length).toBe(15 * 2);
  });
  it('calling toArray on SignalArray returns all events', () => {
    expect(signalsArray.toArray().length).toBe(15 * 2);
  });
  it('calling toArray multiple times always sees all events', () => {
    expect(iterableToArray.length).toBe(15 * 2);
  });
  it('will yield the first peeked value', () => {
    expect(signals[0].fields['transaction.name']).toBe('GET /api/product/0/0');
  });
  it('2nd invocation of toArray sees a new copy of generator invocation', () => {
    expect(iterableToArray[0]['transaction.name']).not.toBe('GET /api/product/0/0');
  });
  it('array iterable holds a copy and will yield the same items', () => {
    const copy = signalsArray.toArray();
    expect(signals[0].fields['transaction.name']).toBe(copy[0].fields['transaction.name']);
  });
});
