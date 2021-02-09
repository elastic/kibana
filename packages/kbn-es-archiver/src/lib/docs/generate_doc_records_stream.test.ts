/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream,
  createMapStream,
  ToolingLog,
} from '@kbn/dev-utils';

import { createGenerateDocRecordsStream } from './generate_doc_records_stream';
import { Progress } from '../progress';
import { createStats } from '../stats';

const log = new ToolingLog();

it('transforms each input index to a stream of docs using scrollSearch helper', async () => {
  const responses: any = {
    foo: [
      {
        body: {
          hits: {
            total: 5,
            hits: [
              { _index: 'foo', _type: '_doc', _id: '0', _source: {} },
              { _index: 'foo', _type: '_doc', _id: '1', _source: {} },
              { _index: 'foo', _type: '_doc', _id: '2', _source: {}, _routing: '0' },
            ],
          },
        },
      },
      {
        body: {
          hits: {
            total: 5,
            hits: [
              { _index: 'foo', _type: '_doc', _id: '3', _source: {} },
              { _index: 'foo', _type: '_doc', _id: '4', _source: {} },
            ],
          },
        },
      },
    ],
    bar: [
      {
        body: {
          hits: {
            total: 2,
            hits: [
              { _index: 'bar', _type: '_doc', _id: '0', _source: {} },
              { _index: 'bar', _type: '_doc', _id: '1', _source: {} },
            ],
          },
        },
      },
    ],
  };

  const client: any = {
    helpers: {
      scrollSearch: jest.fn(function* ({ index }) {
        while (responses[index] && responses[index].length) {
          yield responses[index].shift()!;
        }
      }),
    },
  };

  const stats = createStats('test', log);
  const progress = new Progress();

  const results = await createPromiseFromStreams([
    createListStream(['bar', 'foo']),
    createGenerateDocRecordsStream({
      client,
      stats,
      progress,
    }),
    createMapStream((record: any) => {
      expect(record).toHaveProperty('type', 'doc');
      expect(record.value.source).toEqual({});
      expect(record.value.type).toBe('_doc');
      expect(record.value.index).toMatch(/^(foo|bar)$/);
      expect(record.value.id).toMatch(/^\d+$/);
      expect(record.value.routing === undefined || record.value.routing === '0').toBe(true);
      return `${record.value.index}:${record.value.id}`;
    }),
    createConcatStream([]),
  ]);

  expect(client.helpers.scrollSearch).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          Object {
            "_source": "true",
            "body": Object {
              "query": undefined,
            },
            "index": "bar",
            "rest_total_hits_as_int": true,
            "scroll": "1m",
            "size": 1000,
          },
        ],
        Array [
          Object {
            "_source": "true",
            "body": Object {
              "query": undefined,
            },
            "index": "foo",
            "rest_total_hits_as_int": true,
            "scroll": "1m",
            "size": 1000,
          },
        ],
      ],
      "results": Array [
        Object {
          "type": "return",
          "value": Object {},
        },
        Object {
          "type": "return",
          "value": Object {},
        },
      ],
    }
  `);
  expect(results).toMatchInlineSnapshot(`
    Array [
      "bar:0",
      "bar:1",
      "foo:0",
      "foo:1",
      "foo:2",
      "foo:3",
      "foo:4",
    ]
  `);
  expect(progress).toMatchInlineSnapshot(`
    Progress {
      "complete": 7,
      "loggingInterval": undefined,
      "total": 7,
    }
  `);
  expect(stats).toMatchInlineSnapshot(`
    Object {
      "bar": Object {
        "archived": false,
        "configDocs": Object {
          "tagged": 0,
          "upToDate": 0,
          "upgraded": 0,
        },
        "created": false,
        "deleted": false,
        "docs": Object {
          "archived": 2,
          "indexed": 0,
        },
        "skipped": false,
        "waitForSnapshot": 0,
      },
      "foo": Object {
        "archived": false,
        "configDocs": Object {
          "tagged": 0,
          "upToDate": 0,
          "upgraded": 0,
        },
        "created": false,
        "deleted": false,
        "docs": Object {
          "archived": 5,
          "indexed": 0,
        },
        "skipped": false,
        "waitForSnapshot": 0,
      },
    }
  `);
});
