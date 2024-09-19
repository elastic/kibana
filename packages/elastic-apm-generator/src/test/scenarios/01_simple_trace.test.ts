/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { service } from '../../lib/service';
import { timerange } from '../../lib/timerange';

describe('simple trace', () => {
  let events: Array<Record<string, any>>;

  beforeEach(() => {
    const javaService = service('opbeans-java', 'production', 'java');
    const javaInstance = javaService.instance('instance-1');

    const range = timerange(
      new Date('2021-01-01T00:00:00.000Z').getTime(),
      new Date('2021-01-01T00:15:00.000Z').getTime() - 1
    );

    events = range
      .interval('1m')
      .rate(1)
      .flatMap((timestamp) =>
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
          .serialize()
      );
  });

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
      'event.outcome': 'success',
      'processor.event': 'transaction',
      'processor.name': 'transaction',
      'service.environment': 'production',
      'service.name': 'opbeans-java',
      'service.node.name': 'instance-1',
      'trace.id': 'f6eb2f1cbba2597e89d2a63771c4344d',
      'transaction.duration.us': 1000000,
      'transaction.id': 'e9ece67cbacb52bf',
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
      'event.outcome': 'success',
      'parent.id': 'e7433020f2745625',
      'processor.event': 'span',
      'processor.name': 'transaction',
      'service.environment': 'production',
      'service.name': 'opbeans-java',
      'service.node.name': 'instance-1',
      'span.duration.us': 900000,
      'span.id': '21a776b44b9853dd',
      'span.name': 'GET apm-*/_search',
      'span.subtype': 'elasticsearch',
      'span.type': 'db',
      'trace.id': '048a0647263853abb94649ec0b92bdb4',
      'transaction.id': 'e7433020f2745625',
    });
  });
});
