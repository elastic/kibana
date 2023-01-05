/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { createStripAnsiSerializer } from '@kbn/jest-serializers';

import type { TestFailure } from './get_failures';
import { ExistingFailedTestIssues, FailedTestIssue } from './existing_failed_test_issues';

expect.addSnapshotSerializer(createStripAnsiSerializer());

const log = new ToolingLog();
const writer = new ToolingLogCollectingWriter();
log.setWriters([writer]);

afterEach(() => {
  writer.messages.length = 0;
  jest.clearAllMocks();
});

jest.mock('axios', () => ({
  request: jest.fn(),
}));
const Axios = jest.requireMock('axios');

const mockTestFailure: Omit<TestFailure, 'classname' | 'name'> = {
  failure: '',
  likelyIrrelevant: false,
  time: '100',
  'metadata-json': '',
  'system-out': '',
};

it('captures a list of failed test issue, loads the bodies for each issue, and only fetches what is needed', async () => {
  const existing = new ExistingFailedTestIssues(log);

  Axios.request.mockImplementation(({ data }: any) => ({
    data: {
      existingIssues: data.failures
        .filter((t: any) => t.classname.includes('foo'))
        .map(
          (t: any, i: any): FailedTestIssue => ({
            classname: t.classname,
            name: t.name,
            github: {
              htmlUrl: `htmlurl(${t.classname}/${t.name})`,
              nodeId: `nodeid(${t.classname}/${t.name})`,
              number: (i + 1) * (t.classname.length + t.name.length),
              body: `FAILURE: ${t.classname}/${t.name}`,
            },
          })
        ),
    },
  }));

  const fooFailure: TestFailure = {
    ...mockTestFailure,
    classname: 'foo classname',
    name: 'foo test',
  };
  const barFailure: TestFailure = {
    ...mockTestFailure,
    classname: 'bar classname',
    name: 'bar test',
  };

  await existing.loadForFailures([fooFailure]);
  await existing.loadForFailures([fooFailure, barFailure]);

  expect(existing.getForFailure(fooFailure)).toMatchInlineSnapshot(`
    Object {
      "classname": "foo classname",
      "github": Object {
        "body": "FAILURE: foo classname/foo test",
        "htmlUrl": "htmlurl(foo classname/foo test)",
        "nodeId": "nodeid(foo classname/foo test)",
        "number": 21,
      },
      "name": "foo test",
    }
  `);
  expect(existing.getForFailure(barFailure)).toMatchInlineSnapshot(`undefined`);

  expect(writer.messages).toMatchInlineSnapshot(`
    Array [
      " debg finding 1 existing issues via ci-stats",
      " debg found 1 existing issues",
      " debg loaded 1 existing test issues",
      " debg finding 1 existing issues via ci-stats",
      " debg found 0 existing issues",
      " debg loaded 1 existing test issues",
    ]
  `);
  expect(Axios.request).toMatchInlineSnapshot(`
    [MockFunction] {
      "calls": Array [
        Array [
          Object {
            "baseURL": "https://ci-stats.kibana.dev",
            "data": Object {
              "failures": Array [
                Object {
                  "classname": "foo classname",
                  "name": "foo test",
                },
              ],
            },
            "method": "POST",
            "url": "/v1/find_failed_test_issues",
          },
        ],
        Array [
          Object {
            "baseURL": "https://ci-stats.kibana.dev",
            "data": Object {
              "failures": Array [
                Object {
                  "classname": "bar classname",
                  "name": "bar test",
                },
              ],
            },
            "method": "POST",
            "url": "/v1/find_failed_test_issues",
          },
        ],
      ],
      "results": Array [
        Object {
          "type": "return",
          "value": Object {
            "data": Object {
              "existingIssues": Array [
                Object {
                  "classname": "foo classname",
                  "github": Object {
                    "body": "FAILURE: foo classname/foo test",
                    "htmlUrl": "htmlurl(foo classname/foo test)",
                    "nodeId": "nodeid(foo classname/foo test)",
                    "number": 21,
                  },
                  "name": "foo test",
                },
              ],
            },
          },
        },
        Object {
          "type": "return",
          "value": Object {
            "data": Object {
              "existingIssues": Array [],
            },
          },
        },
      ],
    }
  `);
});
