/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStripAnsiSerializer } from '@kbn/jest-serializers';
import { computeTestID } from '@kbn/scout-reporting';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';

import type { FailedTestIssue, FlakySuiteIssue } from './existing_failed_test_issues';
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
      " debg found 1 existing issues and 0 suite issues",
      " debg loaded 1 existing test issues",
      " debg finding 1 existing issues via ci-stats",
      " debg found 0 existing issues and 0 suite issues",
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

  it('matches the same Scout test on another target, which keeps its test id', async () => {
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

    const scoutFailure1: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test name',
      id: 'test-id-1',
      target: 'serverless=es',
      location: '/path/to/test.ts',
    };

    // the same test on another target: the id hashes the file and the full title, not the target
    const scoutFailure2: TestFailure & { id: string; target: string; location: string } = {
      ...scoutFailure1,
      target: 'stateful',
    };

    await existing.loadForFailures([scoutFailure1]);

    const issue1 = existing.getForFailure(scoutFailure1);
    const issue2 = existing.getForFailure(scoutFailure2);

    expect(issue1).toBeDefined();
    expect(issue2).toBeDefined();
    expect(issue1?.name).toBe('scout test name');
    expect(issue2?.name).toBe('scout test name');
    expect(issue1).toEqual(issue2);
  });

  it('does not ask ci-stats again about the same Scout test on another target', async () => {
    const existing = new ExistingFailedTestIssues(log);

    fetchMock.mockImplementation(async () => jsonResponse({ existingIssues: [] }));

    const scoutFailure1: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'scout suite',
      name: 'scout test name',
      id: 'test-id-1',
      target: 'serverless=es',
      location: '/path/to/test.ts',
    };
    const scoutFailure2: TestFailure & { id: string; target: string; location: string } = {
      ...scoutFailure1,
      target: 'stateful',
    };

    await existing.loadForFailures([scoutFailure1]);
    await existing.loadForFailures([scoutFailure1, scoutFailure2]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps apart Scout tests that only share a title, in different suites', async () => {
    const existing = new ExistingFailedTestIssues(log);

    fetchMock.mockImplementation(async (_input, init) => {
      const body = JSON.parse(init?.body as string) as {
        failures: Array<{ classname: string; name: string }>;
      };
      return jsonResponse({
        existingIssues: body.failures.map(
          (t): FailedTestIssue => ({
            classname: t.classname,
            name: t.name,
            github: {
              htmlUrl: `htmlurl(${t.classname})`,
              nodeId: `nodeid(${t.classname})`,
              number: t.classname.length,
              body: `FAILURE: ${t.classname}/${t.name}`,
            },
          })
        ),
      });
    });

    const dashboardFailure: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'Dashboard',
      name: 'loads successfully',
      id: 'dashboard-id',
      target: 'stateful',
      location: '/path/to/dashboard.spec.ts',
    };
    const discoverFailure: TestFailure & { id: string; target: string; location: string } = {
      ...mockTestFailure,
      classname: 'Discover',
      name: 'loads successfully',
      id: 'discover-id',
      target: 'stateful',
      location: '/path/to/discover.spec.ts',
    };

    // in two reports of the same job, as the second would otherwise count as seen
    await existing.loadForFailures([dashboardFailure]);
    await existing.loadForFailures([discoverFailure]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(existing.getForFailure(dashboardFailure)?.classname).toBe('Dashboard');
    expect(existing.getForFailure(discoverFailure)?.classname).toBe('Discover');
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

describe('flaky suite issues', () => {
  const FTR_FILE = 'x-pack/test/functional/apps/maps/group1/maps_app.ts';
  const JEST_FILE = 'src/platform/plugins/shared/data/server/search/strategy.test.ts';
  const SCOUT_FILE = 'x-pack/test/scout/ui/tests/attachments.spec.ts';

  const ftrFailure: TestFailure = {
    ...mockTestFailure,
    classname: `Chrome X-Pack UI Functional Tests.${FTR_FILE.replace(/\./g, '·')}`,
    name: 'maps app sample data ecommerce should load the layers',
    testType: 'ftr',
    location: FTR_FILE,
  };
  const jestFailure: TestFailure = {
    ...mockTestFailure,
    classname: 'Jest Tests.src/platform/plugins/shared/data/server/search',
    name: 'strategy search returns hits',
    testType: 'jest',
    location: JEST_FILE,
  };
  const scoutFailure: TestFailure & { id: string; target: string; location: string } = {
    ...mockTestFailure,
    classname: 'Attachments',
    name: 'uploads a file',
    id: 'scout-1',
    target: 'stateful',
    location: SCOUT_FILE,
  };

  const suiteIssue = (
    number: number,
    suite: Partial<FlakySuiteIssue['suite']> & { filePath: string },
    state: FlakySuiteIssue['github']['state'] = 'open'
  ): FlakySuiteIssue => ({
    kind: 'suite',
    suite: { testIds: [], ...suite },
    github: {
      nodeId: `node-${number}`,
      number,
      htmlUrl: `https://github.com/elastic/kibana/issues/${number}`,
      state,
      body: '',
    },
  });

  const loadWith = async (suiteIssues: FlakySuiteIssue[], failures: TestFailure[]) => {
    fetchMock.mockImplementation(async () => jsonResponse({ existingIssues: [], suiteIssues }));
    const existing = new ExistingFailedTestIssues(log);
    await existing.loadForFailures(failures);
    return existing;
  };

  const numberOf = (issue: FlakySuiteIssue | undefined) => issue?.github.number;

  it('sends ci-stats the file and Scout test id each failure knows', async () => {
    await loadWith([], [ftrFailure, jestFailure, scoutFailure]);

    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      failures: [
        {
          classname: ftrFailure.classname,
          name: ftrFailure.name,
          filePath: FTR_FILE,
          testId: computeTestID(FTR_FILE, ftrFailure.name),
        },
        {
          classname: jestFailure.classname,
          name: jestFailure.name,
          filePath: JEST_FILE,
          testId: computeTestID(JEST_FILE, jestFailure.name),
        },
        {
          classname: scoutFailure.classname,
          name: scoutFailure.name,
          filePath: SCOUT_FILE,
          testId: 'scout-1',
        },
      ],
    });
  });

  it('matches a failure by the Scout test id the issue lists', async () => {
    const existing = await loadWith(
      [
        suiteIssue(1, { filePath: SCOUT_FILE, title: 'Something else', testIds: ['scout-1'] }),
        suiteIssue(2, { filePath: FTR_FILE, testIds: [computeTestID(FTR_FILE, ftrFailure.name)] }),
      ],
      [scoutFailure, ftrFailure]
    );

    expect(numberOf(existing.getSuiteIssueForFailure(scoutFailure))).toBe(1);
    expect(numberOf(existing.getSuiteIssueForFailure(ftrFailure))).toBe(2);
  });

  it('matches a failure by its file and describe block when the issue does not list its id', async () => {
    const existing = await loadWith(
      [
        suiteIssue(1, { filePath: FTR_FILE, title: 'maps app sample data ecommerce' }),
        suiteIssue(2, { filePath: FTR_FILE, title: 'maps app sample data flights' }),
        suiteIssue(3, { filePath: SCOUT_FILE, title: 'Streams Attachments' }),
        suiteIssue(4, { filePath: JEST_FILE }),
      ],
      [ftrFailure, scoutFailure, jestFailure]
    );

    expect(numberOf(existing.getSuiteIssueForFailure(ftrFailure))).toBe(1);
    // the scout failure only knows its innermost describe title
    expect(numberOf(existing.getSuiteIssueForFailure(scoutFailure))).toBe(3);
    // an issue without a title is about the whole file
    expect(numberOf(existing.getSuiteIssueForFailure(jestFailure))).toBe(4);
  });

  it('prefers an open issue to a closed one, then the newest', async () => {
    const existing = await loadWith(
      [
        suiteIssue(3, { filePath: FTR_FILE }, 'closed'),
        suiteIssue(1, { filePath: FTR_FILE }),
        suiteIssue(2, { filePath: FTR_FILE }),
      ],
      [ftrFailure]
    );

    expect(numberOf(existing.getSuiteIssueForFailure(ftrFailure))).toBe(2);
  });

  it('prefers an issue that lists the test id to a newer one that only covers its describe block', async () => {
    const existing = await loadWith(
      [
        // both nested describes end in the innermost title the Scout failure knows
        suiteIssue(1, { filePath: SCOUT_FILE, title: 'A Attachments', testIds: ['scout-1'] }),
        suiteIssue(2, { filePath: SCOUT_FILE, title: 'B Attachments' }),
      ],
      [scoutFailure]
    );

    expect(numberOf(existing.getSuiteIssueForFailure(scoutFailure))).toBe(1);
  });

  it('still prefers an open issue about the describe block to a closed one that lists the id', async () => {
    // the daily report supersedes a closed issue with a new one about the suite, which only lists
    // the tests that were flaky when it was filed
    const existing = await loadWith(
      [
        suiteIssue(
          1,
          { filePath: SCOUT_FILE, title: 'Attachments', testIds: ['scout-1'] },
          'closed'
        ),
        suiteIssue(2, { filePath: SCOUT_FILE, title: 'Attachments' }),
      ],
      [scoutFailure]
    );

    expect(numberOf(existing.getSuiteIssueForFailure(scoutFailure))).toBe(2);
  });

  it('still links a closed issue when it is the only one', async () => {
    const existing = await loadWith(
      [suiteIssue(1, { filePath: FTR_FILE }, 'closed')],
      [ftrFailure]
    );

    expect(numberOf(existing.getSuiteIssueForFailure(ftrFailure))).toBe(1);
  });

  it('ignores issues about another framework in the same file', async () => {
    const existing = await loadWith(
      [suiteIssue(1, { filePath: FTR_FILE, framework: 'jest' })],
      [ftrFailure]
    );

    expect(existing.getSuiteIssueForFailure(ftrFailure)).toBeUndefined();
  });

  it('keeps the latest copy of an issue returned again for a later batch of failures', async () => {
    const existing = await loadWith([suiteIssue(1, { filePath: FTR_FILE })], [ftrFailure]);
    fetchMock.mockImplementation(async () =>
      jsonResponse({
        existingIssues: [],
        suiteIssues: [suiteIssue(1, { filePath: FTR_FILE }, 'closed')],
      })
    );
    await existing.loadForFailures([{ ...ftrFailure, name: 'maps app another test' }]);

    expect(existing.getSuiteIssueForFailure(ftrFailure)?.github.state).toBe('closed');
  });

  it('copes with a ci-stats response that has no suite issues yet', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ existingIssues: [] }));
    const existing = new ExistingFailedTestIssues(log);
    await existing.loadForFailures([ftrFailure]);

    expect(existing.getSuiteIssueForFailure(ftrFailure)).toBeUndefined();
  });

  it('asks a ci-stats that rejects the suite issue fields for per-test issues only, from then on', async () => {
    const perTestIssue: FailedTestIssue = {
      classname: ftrFailure.classname,
      name: ftrFailure.name,
      github: {
        nodeId: 'node-1',
        number: 1,
        htmlUrl: 'https://github.com/elastic/kibana/issues/1',
        body: 'body',
      },
    };
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: 'BadRequestError',
            status: 400,
            message: '[body.failures[0]] unexpected fields: filePath, testId',
          }),
          { status: 400 }
        )
      )
      .mockImplementation(async () => jsonResponse({ existingIssues: [perTestIssue] }));

    const existing = new ExistingFailedTestIssues(log);
    await existing.loadForFailures([ftrFailure]);
    await existing.loadForFailures([jestFailure]);

    const sent = fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string).failures);
    expect(sent).toEqual([
      [
        {
          classname: ftrFailure.classname,
          name: ftrFailure.name,
          filePath: FTR_FILE,
          testId: computeTestID(FTR_FILE, ftrFailure.name),
        },
      ],
      [{ classname: ftrFailure.classname, name: ftrFailure.name }],
      [{ classname: jestFailure.classname, name: jestFailure.name }],
    ]);
    expect(existing.getForFailure(ftrFailure)?.github.number).toBe(1);
    expect(existing.getSuiteIssueForFailure(ftrFailure)).toBeUndefined();
    expect(writer.messages).toContainEqual(
      expect.stringContaining('ci-stats does not know suite issues yet')
    );
  });

  it('still fails on a 400 that is not about the suite issue fields', async () => {
    fetchMock.mockImplementation(
      async () => new Response('too many failures, max is 10k', { status: 400 })
    );
    const existing = new ExistingFailedTestIssues(log);

    await expect(existing.loadForFailures([ftrFailure])).rejects.toThrow(
      '400:too many failures, max is 10k'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
