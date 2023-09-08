/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, ApmFields, SynthtraceGenerator, timerange } from '@kbn/apm-synthtrace-client';

describe('simple trace', () => {
  let iterable: SynthtraceGenerator<ApmFields>;
  let events: Array<Record<string, any>>;

  beforeEach(() => {
    const javaService = apm.service({
      name: 'opbeans-java',
      environment: 'production',
      agentName: 'java',
    });
    const javaInstance = javaService.instance('instance-1').containerId('instance-1');

    const range = timerange(
      new Date('2021-01-01T00:00:00.000Z'),
      new Date('2021-01-01T00:15:00.000Z')
    );

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

    events = Array.from(iterable).flatMap((event) => event.serialize());
  });

  // TODO this is not entirely factual, since id's are generated of a global sequence number
  it('generates the same data every time', () => {
    expect(events).toMatchSnapshot();
  });

  it('generates 15 transaction events', () => {
    expect(events.filter((event) => event['processor.event'] === 'transaction').length).toEqual(15);
  });

  it('generates 15 span events', () => {
    expect(events.filter((event) => event['processor.event'] === 'span').length).toEqual(15);
  });

  it('correctly sets the trace/transaction id of children', () => {
    const [transaction, span] = events;

    expect(span['transaction.id']).toEqual(transaction['transaction.id']);
    expect(span['parent.id']).toEqual(transaction['transaction.id']);

    expect(span['trace.id']).toEqual(transaction['trace.id']);
  });

  it('outputs transaction events', () => {
    const [transaction] = events;

    expect(transaction).toEqual({
      '@timestamp': 1609459200000,
      'agent.name': 'java',
      'container.id': 'instance-1',
      'event.outcome': 'success',
      'host.name': 'instance-1',
      'processor.event': 'transaction',
      'processor.name': 'transaction',
      'service.environment': 'production',
      'service.name': 'opbeans-java',
      'service.node.name': 'instance-1',
      'timestamp.us': 1609459200000000,
      'trace.id': '00000000000000000000000000000241',
      'transaction.duration.us': 1000000,
      'transaction.id': '0000000000000240',
      'transaction.name': 'GET /api/product/list',
      'transaction.type': 'request',
      'transaction.sampled': true,
    });
  });

  it('outputs span events', () => {
    const [, span] = events;

    expect(span).toEqual({
      '@timestamp': 1609459200050,
      'agent.name': 'java',
      'container.id': 'instance-1',
      'event.outcome': 'success',
      'host.name': 'instance-1',
      'parent.id': '0000000000000300',
      'processor.event': 'span',
      'processor.name': 'transaction',
      'service.environment': 'production',
      'service.name': 'opbeans-java',
      'service.node.name': 'instance-1',
      'span.duration.us': 900000,
      'span.id': '0000000000000302',
      'span.name': 'GET apm-*/_search',
      'span.subtype': 'elasticsearch',
      'span.type': 'db',
      'timestamp.us': 1609459200050000,
      'trace.id': '00000000000000000000000000000301',
      'transaction.id': '0000000000000300',
    });
  });
});
