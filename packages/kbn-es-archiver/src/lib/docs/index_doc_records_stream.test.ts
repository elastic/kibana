/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { createRecursiveSerializer } from '@kbn/jest-serializers';

import { createListStream, createPromiseFromStreams } from '@kbn/utils';

import { Progress } from '../progress';
import { createIndexDocRecordsStream } from './index_doc_records_stream';
import { createStats } from '../stats';

const AT_LINE_RE = /^\s+at /m;

expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => typeof v === 'string' && AT_LINE_RE.test(v),
    (v: string) => {
      const lines = v.split('\n');
      const withoutStack: string[] = [];

      // move source lines to withoutStack, filtering out stacktrace lines
      while (lines.length) {
        const line = lines.shift()!;

        if (!AT_LINE_RE.test(line)) {
          withoutStack.push(line);
        } else {
          // push in representation of stack trace indented to match "at"
          withoutStack.push(`${' '.repeat(line.indexOf('at'))}<stack trace>`);

          // shift off all subsequent `at ...` lines
          while (lines.length && AT_LINE_RE.test(lines[0])) {
            lines.shift();
          }
        }
      }

      return withoutStack.join('\n');
    }
  )
);

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
          Object {
            "headers": Object {
              "x-elastic-product-origin": "kibana",
            },
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
          "value": undefined,
        },
        Object {
          "type": "return",
          "value": undefined,
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
                    <stack trace>
                Error: Bulk doc failure [operation=index]:
                  doc: {\\"hello\\":\\"world\\"}
                  error: {\\"reason\\":\\"2 conflicts with something\\"}
                    <stack trace>
                Error: Bulk doc failure [operation=index]:
                  doc: {\\"hello\\":\\"world\\"}
                  error: {\\"reason\\":\\"3 conflicts with something\\"}
                    <stack trace>"
          `);
  });
});
