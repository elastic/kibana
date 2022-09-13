/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transaction } from '../dsl/apm/transaction';

describe('output apm events to elasticsearch', () => {
  let event: Transaction;

  beforeEach(() => {
    event = new Transaction({
      '@timestamp': new Date('2020-12-31T23:00:00.000Z').getTime(),
      'processor.event': 'transaction',
      'processor.name': 'transaction',
      'service.node.name': 'instance-a',
    });
  });

  it('properly formats @timestamp', () => {
    const doc = event.toDocument();
    expect(doc['@timestamp']).toEqual('2020-12-31T23:00:00.000Z');
  });

  it('formats a nested object', () => {
    const doc = event.toDocument();

    expect(doc.processor).toEqual({
      event: 'transaction',
      name: 'transaction',
    });
  });

  it('formats all fields consistently', () => {
    // StreamProcessor will call enrichWithVersionInformation on all signals.
    const doc = event.enrichWithVersionInformation('8.0.0', 8).toDocument();
    // These are not stable (generated from incremental global id).
    delete doc.trace;
    delete doc.transaction;
    expect(doc).toMatchInlineSnapshot(`
      Object {
        "@timestamp": "2020-12-31T23:00:00.000Z",
        "ecs": Object {
          "version": "1.4",
        },
        "event": Object {
          "outcome": "unknown",
        },
        "observer": Object {
          "type": "synthtrace",
          "version": "8.0.0",
          "version_major": 8,
        },
        "processor": Object {
          "event": "transaction",
          "name": "transaction",
        },
        "service": Object {
          "node": Object {
            "name": "instance-a",
          },
        },
        "timestamp": Object {
          "us": 1609455600000000,
        },
      }
    `);
  });
});
