/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createListStream, createPromiseFromStreams, ToolingLog } from '@kbn/dev-utils';

import { Progress } from '../progress';
import { createIndexDocRecordsStream } from './index_doc_records_stream';
import { createStats } from '../stats';

const log = new ToolingLog();

class MockClient {
  helpers = {
    bulk: jest.fn(),
  };
}

const testRecords = [
  {
    type: 'doc',
    value: {
      index: 'foo',
      id: '0',
      source: {
        hello: 'world',
      },
    },
  },
  {
    type: 'doc',
    value: {
      index: 'foo',
      id: '1',
      source: {
        hello: 'world',
      },
    },
  },
  {
    type: 'doc',
    value: {
      index: 'foo',
      id: '2',
      source: {
        hello: 'world',
      },
    },
  },
  {
    type: 'doc',
    value: {
      index: 'foo',
      id: '3',
      source: {
        hello: 'world',
      },
    },
  },
];

it('indexes documents using the bulk client helper', async () => {
  const client = new MockClient();
  client.helpers.bulk.mockImplementation(async () => {});

  const progress = new Progress();
  const stats = createStats('test', log);

  await createPromiseFromStreams([
    createListStream(testRecords),
    createIndexDocRecordsStream(client as any, stats, progress),
  ]);

  expect(stats).toMatchInlineSnapshot(`
    Object {
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
          "archived": 0,
          "indexed": 4,
        },
        "skipped": false,
        "waitForSnapshot": 0,
      },
    }
  `);
  expect(progress).toMatchInlineSnapshot(`
    Progress {
      "complete": 4,
      "loggingInterval": undefined,
      "total": undefined,
    }
  `);
  expect(client.helpers.bulk).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          Object {
            "datasource": Array [
              Object {
                "hello": "world",
              },
            ],
            "onDocument": [Function],
            "onDrop": [Function],
            "retries": 5,
          },
        ],
        Array [
          Object {
            "datasource": Array [
              Object {
                "hello": "world",
              },
              Object {
                "hello": "world",
              },
              Object {
                "hello": "world",
              },
            ],
            "onDocument": [Function],
            "onDrop": [Function],
            "retries": 5,
          },
        ],
      ],
      "results": Array [
        Object {
          "type": "return",
          "value": Promise {},
        },
        Object {
          "type": "return",
          "value": Promise {},
        },
      ],
    }
  `);
});

describe('bulk helper onDocument param', () => {
  it('returns index ops for each doc', async () => {
    expect.assertions(testRecords.length);

    const client = new MockClient();
    client.helpers.bulk.mockImplementation(async ({ datasource, onDocument }) => {
      for (const d of datasource) {
        const op = onDocument(d);
        expect(op).toEqual({
          index: {
            _index: 'foo',
            _id: expect.stringMatching(/^\d$/),
          },
        });
      }
    });

    const stats = createStats('test', log);
    const progress = new Progress();

    await createPromiseFromStreams([
      createListStream(testRecords),
      createIndexDocRecordsStream(client as any, stats, progress),
    ]);
  });

  it('returns create ops for each doc when instructed', async () => {
    expect.assertions(testRecords.length);

    const client = new MockClient();
    client.helpers.bulk.mockImplementation(async ({ datasource, onDocument }) => {
      for (const d of datasource) {
        const op = onDocument(d);
        expect(op).toEqual({
          create: {
            _index: 'foo',
            _id: expect.stringMatching(/^\d$/),
          },
        });
      }
    });

    const stats = createStats('test', log);
    const progress = new Progress();

    await createPromiseFromStreams([
      createListStream(testRecords),
      createIndexDocRecordsStream(client as any, stats, progress, true),
    ]);
  });
});

describe('bulk helper onDrop param', () => {
  it('throws an error reporting any docs which failed all retry attempts', async () => {
    const client = new MockClient();
    let counter = -1;
    client.helpers.bulk.mockImplementation(async ({ datasource, onDrop }) => {
      for (const d of datasource) {
        counter++;
        if (counter > 0) {
          onDrop({
            document: d,
            error: {
              reason: `${counter} conflicts with something`,
            },
          });
        }
      }
    });

    const stats = createStats('test', log);
    const progress = new Progress();

    const promise = createPromiseFromStreams([
      createListStream(testRecords),
      createIndexDocRecordsStream(client as any, stats, progress),
    ]);

    await expect(promise).rejects.toThrowErrorMatchingInlineSnapshot(`
            "
                Error: Bulk doc failure [operation=index]:
                  doc: {\\"hello\\":\\"world\\"}
                  error: {\\"reason\\":\\"1 conflicts with something\\"}
                    at Array.map (<anonymous>)
                    at indexDocs (/Users/spalger/kbn-dev/master/kibana/packages/kbn-es-archiver/src/lib/docs/index_doc_records_stream.ts:49:13)
                    at Writable.writev [as _writev] (/Users/spalger/kbn-dev/master/kibana/packages/kbn-es-archiver/src/lib/docs/index_doc_records_stream.ts:73:9)
                Error: Bulk doc failure [operation=index]:
                  doc: {\\"hello\\":\\"world\\"}
                  error: {\\"reason\\":\\"2 conflicts with something\\"}
                    at Array.map (<anonymous>)
                    at indexDocs (/Users/spalger/kbn-dev/master/kibana/packages/kbn-es-archiver/src/lib/docs/index_doc_records_stream.ts:49:13)
                    at Writable.writev [as _writev] (/Users/spalger/kbn-dev/master/kibana/packages/kbn-es-archiver/src/lib/docs/index_doc_records_stream.ts:73:9)
                Error: Bulk doc failure [operation=index]:
                  doc: {\\"hello\\":\\"world\\"}
                  error: {\\"reason\\":\\"3 conflicts with something\\"}
                    at Array.map (<anonymous>)
                    at indexDocs (/Users/spalger/kbn-dev/master/kibana/packages/kbn-es-archiver/src/lib/docs/index_doc_records_stream.ts:49:13)
                    at Writable.writev [as _writev] (/Users/spalger/kbn-dev/master/kibana/packages/kbn-es-archiver/src/lib/docs/index_doc_records_stream.ts:73:9)"
          `);
  });
});
