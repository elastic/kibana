/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream,
  createMapStream,
} from '@kbn/utils';

import { createGenerateDocRecordsStream } from './generate_doc_records_stream';
import { Progress } from '../progress';
import { createStats } from '../stats';

const log = new ToolingLog();

interface SearchResponses {
  [key: string]: Array<{
    body: {
      hits: {
        total: number;
        hits: Array<{
          _index: string;
          _id: string;
          _source: Record<string, unknown>;
        }>;
      };
    };
  }>;
}

function createMockClient(responses: SearchResponses) {
  // TODO: replace with proper mocked client
  const client: any = {
    helpers: {
      scrollSearch: jest.fn(function* ({ index }) {
        while (responses[index] && responses[index].length) {
          yield responses[index].shift()!;
        }
      }),
    },
  };
  return client;
}

describe('esArchiver: createGenerateDocRecordsStream()', () => {
  it('transforms each input index to a stream of docs using scrollSearch helper', async () => {
    const responses = {
      foo: [
        {
          body: {
            hits: {
              total: 5,
              hits: [
                { _index: 'foo', _id: '0', _source: {} },
                { _index: 'foo', _id: '1', _source: {} },
                { _index: 'foo', _id: '2', _source: {} },
              ],
            },
          },
        },
        {
          body: {
            hits: {
              total: 5,
              hits: [
                { _index: 'foo', _id: '3', _source: {} },
                { _index: 'foo', _id: '4', _source: {} },
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
                { _index: 'bar', _id: '0', _source: {} },
                { _index: 'bar', _id: '1', _source: {} },
              ],
            },
          },
        },
      ],
    };

    const client = createMockClient(responses);

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
        expect(record.value.index).toMatch(/^(foo|bar)$/);
        expect(record.value.id).toMatch(/^\d+$/);
        return `${record.value.index}:${record.value.id}`;
      }),
      createConcatStream([]),
    ]);

    expect(client.helpers.scrollSearch).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          Object {
            "_source": true,
            "index": "bar",
            "query": undefined,
            "rest_total_hits_as_int": true,
            "scroll": "1m",
            "size": 1000,
          },
          Object {
            "headers": Object {
              "x-elastic-product-origin": "kibana",
            },
          },
        ],
        Array [
          Object {
            "_source": true,
            "index": "foo",
            "query": undefined,
            "rest_total_hits_as_int": true,
            "scroll": "1m",
            "size": 1000,
          },
          Object {
            "headers": Object {
              "x-elastic-product-origin": "kibana",
            },
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

  describe('keepIndexNames', () => {
    it('changes .kibana* index names if keepIndexNames is not enabled', async () => {
      const hits = [{ _index: '.kibana_7.16.0_001', _id: '0', _source: {} }];
      const responses = {
        ['.kibana_7.16.0_001']: [{ body: { hits: { hits, total: hits.length } } }],
      };
      const client = createMockClient(responses);
      const stats = createStats('test', log);
      const progress = new Progress();

      const results = await createPromiseFromStreams([
        createListStream(['.kibana_7.16.0_001']),
        createGenerateDocRecordsStream({
          client,
          stats,
          progress,
        }),
        createMapStream((record: { value: { index: string; id: string } }) => {
          return `${record.value.index}:${record.value.id}`;
        }),
        createConcatStream([]),
      ]);
      expect(results).toEqual(['.kibana_1:0']);
    });

    it('does not change non-.kibana* index names if keepIndexNames is not enabled', async () => {
      const hits = [{ _index: '.foo', _id: '0', _source: {} }];
      const responses = {
        ['.foo']: [{ body: { hits: { hits, total: hits.length } } }],
      };
      const client = createMockClient(responses);
      const stats = createStats('test', log);
      const progress = new Progress();

      const results = await createPromiseFromStreams([
        createListStream(['.foo']),
        createGenerateDocRecordsStream({
          client,
          stats,
          progress,
        }),
        createMapStream((record: { value: { index: string; id: string } }) => {
          return `${record.value.index}:${record.value.id}`;
        }),
        createConcatStream([]),
      ]);
      expect(results).toEqual(['.foo:0']);
    });

    it('does not change .kibana* index names if keepIndexNames is enabled', async () => {
      const hits = [{ _index: '.kibana_7.16.0_001', _id: '0', _source: {} }];
      const responses = {
        ['.kibana_7.16.0_001']: [{ body: { hits: { hits, total: hits.length } } }],
      };
      const client = createMockClient(responses);
      const stats = createStats('test', log);
      const progress = new Progress();

      const results = await createPromiseFromStreams([
        createListStream(['.kibana_7.16.0_001']),
        createGenerateDocRecordsStream({
          client,
          stats,
          progress,
          keepIndexNames: true,
        }),
        createMapStream((record: { value: { index: string; id: string } }) => {
          return `${record.value.index}:${record.value.id}`;
        }),
        createConcatStream([]),
      ]);
      expect(results).toEqual(['.kibana_7.16.0_001:0']);
    });
  });
});
