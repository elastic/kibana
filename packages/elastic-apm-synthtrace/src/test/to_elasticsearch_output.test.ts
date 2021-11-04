/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../lib/entity';
import { toElasticsearchOutput } from '../lib/output/to_elasticsearch_output';

const writeTargets = {
  transaction: 'apm-8.0.0-transaction',
  span: 'apm-8.0.0-span',
  metric: 'apm-8.0.0-metric',
  error: 'apm-8.0.0-error',
};

describe('output to elasticsearch', () => {
  let event: Fields;

  beforeEach(() => {
    event = {
      '@timestamp': new Date('2020-12-31T23:00:00.000Z').getTime(),
      'processor.event': 'transaction',
      'processor.name': 'transaction',
      'service.node.name': 'instance-a',
    };
  });

  it('properly formats @timestamp', () => {
    const doc = toElasticsearchOutput({ events: [event], writeTargets })[0] as any;

    expect(doc._source['@timestamp']).toEqual('2020-12-31T23:00:00.000Z');
  });

  it('formats a nested object', () => {
    const doc = toElasticsearchOutput({ events: [event], writeTargets })[0] as any;

    expect(doc._source.processor).toEqual({
      event: 'transaction',
      name: 'transaction',
    });
  });

  it('formats all fields consistently', () => {
    const doc = toElasticsearchOutput({ events: [event], writeTargets })[0] as any;

    expect(doc._source).toMatchInlineSnapshot(`
      Object {
        "@timestamp": "2020-12-31T23:00:00.000Z",
        "ecs": Object {
          "version": "1.4",
        },
        "observer": Object {
          "version": "7.16.0",
          "version_major": 7,
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
