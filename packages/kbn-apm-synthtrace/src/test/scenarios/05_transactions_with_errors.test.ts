/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pick } from 'lodash';
import { apm } from '../../lib/apm';
import { Instance } from '../../lib/apm/instance';

describe('transactions with errors', () => {
  let instance: Instance;
  const timestamp = new Date('2021-01-01T00:00:00.000Z').getTime();

  beforeEach(() => {
    instance = apm.service('opbeans-java', 'production', 'java').instance('instance');
  });
  it('generates error events', () => {
    const events = instance
      .transaction('GET /api')
      .timestamp(timestamp)
      .errors(instance.error('test error').timestamp(timestamp))
      .serialize();

    const errorEvents = events.filter((event) => event['processor.event'] === 'error');

    expect(errorEvents.length).toEqual(1);

    expect(
      pick(errorEvents[0], 'processor.event', 'processor.name', 'error.exception', '@timestamp')
    ).toEqual({
      'processor.event': 'error',
      'processor.name': 'error',
      '@timestamp': timestamp,
      'error.exception': [{ message: 'test error' }],
    });
  });

  it('sets the transaction and trace id', () => {
    const [transaction, error] = instance
      .transaction('GET /api')
      .timestamp(timestamp)
      .errors(instance.error('test error').timestamp(timestamp))
      .serialize();

    const keys = ['transaction.id', 'trace.id', 'transaction.type'];

    expect(pick(error, keys)).toEqual({
      'transaction.id': transaction['transaction.id'],
      'trace.id': transaction['trace.id'],
      'transaction.type': 'request',
    });
  });

  it('sets the error grouping key', () => {
    const [, error] = instance
      .transaction('GET /api')
      .timestamp(timestamp)
      .errors(instance.error('test error').timestamp(timestamp))
      .serialize();

    expect(error['error.grouping_name']).toEqual('test error');
    expect(error['error.grouping_key']).toMatchInlineSnapshot(`"0000000000000000000000test error"`);
  });
});
