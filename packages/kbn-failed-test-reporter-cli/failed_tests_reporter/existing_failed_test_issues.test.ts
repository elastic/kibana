/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStripAnsiSerializer } from '@kbn/jest-serializers';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';

import type { FailedTestIssue } from './existing_failed_test_issues';
import { ExistingFailedTestIssues } from './existing_failed_test_issues';
import type { TestFailure } from './get_failures';

expect.addSnapshotSerializer(createStripAnsiSerializer());

const log = new ToolingLog();
const writer = new ToolingLogCollectingWriter();
log.setWriters([writer]);

const fetchMock = jest.spyOn(global, 'fetch');

afterEach(() => {
  writer.messages.length = 0;
  jest.clearAllMocks();
});

const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

const mockTestFailure: Omit<TestFailure, 'classname' | 'name'> = {
  failure: '',
  likelyIrrelevant: false,
  time: '100',
  'metadata-json': '',
  'system-out': '',
};

it('captures a list of failed test issue, loads the bodies for each issue, and only fetches what is needed', async () => {
  const existing = new ExistingFailedTestIssues(log);

  fetchMock.mockImplementation(async (_input, init) => {
    const body = JSON.parse(init?.body as string) as {
      failures: Array<{ classname: string; name: string }>;
    };
    return jsonResponse({
      existingIssues: body.failures
        .filter((t) => t.classname.includes('foo'))
        .map(
          (t, i): FailedTestIssue => ({
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
    });
  });

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

  expect(fetchMock).toHaveBeenCalledTimes(2);
  // Argument shape: each call should be (url, init) with method POST and a JSON body
  // describing the failure to look up. Snapshot the call args after parsing the body.
  const calls = fetchMock.mock.calls.map(([url, init]) => ({
    url: typeof url === 'string' ? url : url.toString(),
    method: init?.method,
    body: JSON.parse(init?.body as string),
  }));
  expect(calls).toMatchInlineSnapshot(`
    Array [
      Object {
        "body": Object {
          "failures": Array [
            Object {
              "classname": "foo classname",
              "name": "foo test",
            },
          ],
        },
        "method": "POST",
        "url": "https://ci-stats.kibana.dev/v1/find_failed_test_issues",
      },
      Object {
        "body": Object {
          "failures": Array [
            Object {
              "classname": "bar classname",
              "name": "bar test",
            },
          ],
        },
        "method": "POST",
        "url": "https://ci-stats.kibana.dev/v1/find_failed_test_issues",
      },
    ]
  `);
});

describe('Scout failures', () => {
  it('detects Scout failures correctly', () => {
    const existing = new ExistingFailedTestIssues(log);

    const scoutFailure: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test',
      id: 'test-id-1',
      target: 'stateful',
      location: '/path/to/test.ts',
    };

    const ftrFailure: TestFailure = {
      ...mockTestFailure,
      classname: 'ftr suite',
      name: 'ftr test',
    };

    expect(existing.isScoutFailure(scoutFailure)).toBe(true);
    expect(existing.isScoutFailure(ftrFailure)).toBe(false);
  });

  it('matches Scout failures by name only, ignoring target differences', async () => {
    const existing = new ExistingFailedTestIssues(log);

    fetchMock.mockImplementation(async (_input, init) => {
      const body = JSON.parse(init?.body as string) as {
        failures: Array<{ classname: string; name: string }>;
      };
      return jsonResponse({
        existingIssues: body.failures
          .filter((t) => t.name === 'scout test name')
          .map(
            (t): FailedTestIssue => ({
              classname: t.classname || 'scout suite',
              name: t.name,
              github: {
                htmlUrl: 'htmlurl(scout test name)',
                nodeId: 'nodeid(scout test name)',
                number: 123,
                body: 'FAILURE: scout test name',
              },
            })
          ),
      });
    });

    // First Scout failure with target chrome
    const scoutFailure1: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test name',
      id: 'test-id-1',
      target: 'serverless=es',
      location: '/path/to/test.ts',
    };

    // Second Scout failure with same name but different target
    const scoutFailure2: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test name',
      id: 'test-id-2',
      target: 'stateful',
      location: '/path/to/test.ts',
    };

    // Load the first failure
    await existing.loadForFailures([scoutFailure1]);

    // Both failures should match the same issue (by name only)
    const issue1 = existing.getForFailure(scoutFailure1);
    const issue2 = existing.getForFailure(scoutFailure2);

    expect(issue1).toBeDefined();
    expect(issue2).toBeDefined();
    expect(issue1?.name).toBe('scout test name');
    expect(issue2?.name).toBe('scout test name');
    expect(issue1).toEqual(issue2);
  });

  it('correctly identifies seen Scout failures by name only', async () => {
    const existing = new ExistingFailedTestIssues(log);

    fetchMock.mockImplementation(async () => jsonResponse({ existingIssues: [] }));

    // First Scout failure with target chrome
    const scoutFailure1: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test name',
      id: 'test-id-1',
      target: 'serverless=es',
      location: '/path/to/test.ts',
    };

    // Second Scout failure with same name but different target
    const scoutFailure2: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test name',
      id: 'test-id-2',
      target: 'stateful',
      location: '/path/to/test.ts',
    };

    // Load the first failure
    await existing.loadForFailures([scoutFailure1]);

    // The second failure should be considered "seen" because it has the same name
    // This tests the isFailureSeen logic
    await existing.loadForFailures([scoutFailure1, scoutFailure2]);

    // Should only make one API call (for the first failure, second is already seen)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('distinguishes between Scout and FTR failures correctly', async () => {
    const existing = new ExistingFailedTestIssues(log);

    fetchMock.mockImplementation(async (_input, init) => {
      const body = JSON.parse(init?.body as string) as {
        failures: Array<{ classname: string; name: string }>;
      };
      return jsonResponse({
        existingIssues: body.failures.map(
          (t, i): FailedTestIssue => ({
            classname: t.classname,
            name: t.name,
            github: {
              htmlUrl: `htmlurl(${t.classname}/${t.name})`,
              nodeId: `nodeid(${t.classname}/${t.name})`,
              number: i + 1,
              body: `FAILURE: ${t.classname}/${t.name}`,
            },
          })
        ),
      });
    });

    const scoutFailure: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test',
      id: 'test-id-1',
      target: 'serverless=es',
      location: '/path/to/test.ts',
    };

    const ftrFailure: TestFailure = {
      ...mockTestFailure,
      classname: 'ftr suite',
      name: 'ftr test',
    };

    // Load both failures
    await existing.loadForFailures([scoutFailure, ftrFailure]);

    // Each should find its own issue
    const scoutIssue = existing.getForFailure(scoutFailure);
    const ftrIssue = existing.getForFailure(ftrFailure);

    expect(scoutIssue).toBeDefined();
    expect(scoutIssue?.name).toBe('scout test');
    expect(ftrIssue).toBeDefined();
    expect(ftrIssue?.name).toBe('ftr test');
  });

  it('returns undefined for Scout failures when no matching issue exists', async () => {
    const existing = new ExistingFailedTestIssues(log);

    fetchMock.mockImplementation(async () => jsonResponse({ existingIssues: [] }));

    const scoutFailure: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test',
      id: 'test-id-1',
      target: 'stateful',
      location: '/path/to/test.ts',
    };

    await existing.loadForFailures([scoutFailure]);

    const issue = existing.getForFailure(scoutFailure);
    expect(issue).toBeUndefined();
  });
});
