/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

import { createFailureIssue, updateFailureIssue } from './report_failure';

jest.mock('./github_api');
const { GithubApi } = jest.requireMock('./github_api');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createFailureIssue()', () => {
  it('creates new github issue with failure text, link to issue, and valid metadata', async () => {
    const api = new GithubApi();

    await createFailureIssue(
      'https://build-url',
      {
        classname: 'some.classname',
        failure: 'this is the failure text',
        name: 'test name',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
      },
      api,
      'main',
      'kibana-on-merge'
    );

    expect(api.createIssue).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            "Failing test: some.classname - test name",
            "A test failed on a tracked branch

      \`\`\`
      this is the failure text
      \`\`\`

      First failure: [kibana-on-merge - main](https://build-url)

      <!-- kibanaCiData = {\\"failed-test\\":{\\"test.class\\":\\"some.classname\\",\\"test.name\\":\\"test name\\",\\"test.failCount\\":1}} -->",
            Array [
              "failed-test",
            ],
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('creates new github issue with title prepended', async () => {
    const api = new GithubApi();

    await createFailureIssue(
      'https://build-url',
      {
        classname: 'some.classname',
        failure: 'this is the failure text',
        name: 'test name',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
      },
      api,
      'main',
      'kibana-on-merge',
      '[MKI][QA]'
    );

    expect(api.createIssue).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            "Failing test: [MKI][QA] some.classname - test name",
            "A test failed on a tracked branch

      \`\`\`
      this is the failure text
      \`\`\`

      First failure: [kibana-on-merge - main](https://build-url)

      <!-- kibanaCiData = {\\"failed-test\\":{\\"test.class\\":\\"some.classname\\",\\"test.name\\":\\"test name\\",\\"test.failCount\\":1}} -->",
            Array [
              "failed-test",
            ],
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });
});

describe('updateFailureIssue()', () => {
  it('increments failure count and adds new comment to issue', async () => {
    const api = new GithubApi();

    await updateFailureIssue(
      'https://build-url',
      {
        classname: 'foo',
        name: 'test',
        github: {
          htmlUrl: 'https://github.com/issues/1234',
          number: 1234,
          nodeId: 'abcd',
          body: dedent`
            # existing issue body

            <!-- kibanaCiData = {"failed-test":{"test.failCount":10}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge'
    );

    expect(api.editIssueBodyAndEnsureOpen).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            1234,
            "# existing issue body

      <!-- kibanaCiData = {\\"failed-test\\":{\\"test.failCount\\":11}} -->\\"",
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
    expect(api.addIssueComment).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            1234,
            "New failure: [kibana-on-merge - main](https://build-url)",
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('adds comment with target information for Scout failures', async () => {
    const api = new GithubApi();

    await updateFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test',
        github: {
          htmlUrl: 'https://github.com/issues/5678',
          number: 5678,
          nodeId: 'efgh',
          body: dedent`
            # existing issue body

            <!-- kibanaCiData = {"failed-test":{"test.failCount":5}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'scout.suite',
        name: 'scout test',
        failure: 'test failure',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
        id: 'test-id-123',
        target: 'local-serverless-observability_complete',
        location: '/path/to/test.ts',
        duration: 5000,
        owners: 'team:test',
        commandLine: 'npx playwright test --config=config.ts',
      }
    );

    expect(api.addIssueComment).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            5678,
            "New failure for \\"local-serverless-observability_complete\\" target: [kibana-on-merge - main](https://build-url)",
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('does not include new error message when error.message is missing', async () => {
    const api = new GithubApi();

    await updateFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test',
        github: {
          htmlUrl: 'https://github.com/issues/9101',
          number: 9101,
          nodeId: 'ijkl',
          body: dedent`
            # existing issue body

            \`\`\`
            Previous error message
            \`\`\`

            <!-- kibanaCiData = {"failed-test":{"test.failCount":5}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'scout.suite',
        name: 'scout test',
        failure: 'new error stack trace',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
        id: 'test-id-456',
        target: 'local-serverless-observability_complete',
        location: '/path/to/test.ts',
        duration: 5000,
        owners: 'team:test',
      }
    );

    const comment = api.addIssueComment.mock.calls[0][1] as string;
    expect(comment).toContain('New failure for "local-serverless-observability_complete" target');
    expect(comment).not.toContain('New error message');
  });

  it('does not include new error message when error.message matches issue body', async () => {
    const api = new GithubApi();

    await updateFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test',
        github: {
          htmlUrl: 'https://github.com/issues/1112',
          number: 1112,
          nodeId: 'mnop',
          body: dedent`
            # existing issue body

            \`\`\`
            TimeoutError: locator.click: Timeout 10000ms exceeded.
              at /path/to/test.ts:42:10
              at async Runner.run (/node_modules/runner.js:100:5)
            \`\`\`

            <!-- kibanaCiData = {"failed-test":{"test.failCount":2}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'scout.suite',
        name: 'scout test',
        failure:
          'TimeoutError: locator.click: Timeout 10000ms exceeded.\n  at /path/to/test.ts:42:10',
        errorMessage: 'TimeoutError: locator.click: Timeout 10000ms exceeded.',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
        id: 'test-id-1112',
        target: 'local-serverless-observability_complete',
        location: '/path/to/test.ts',
        duration: 5000,
        owners: 'team:test',
      }
    );

    const comment = api.addIssueComment.mock.calls[0][1] as string;
    expect(comment).toContain('New failure for "local-serverless-observability_complete" target');
    expect(comment).not.toContain('New error message');
  });

  it('includes new error message when error.message changed', async () => {
    const api = new GithubApi();

    await updateFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test',
        github: {
          htmlUrl: 'https://github.com/issues/1213',
          number: 1213,
          nodeId: 'qrst',
          body: dedent`
            # existing issue body

            \`\`\`
            Previous error message
            \`\`\`

            <!-- kibanaCiData = {"failed-test":{"test.failCount":3}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'scout.suite',
        name: 'scout test',
        failure: 'new error stack trace',
        errorMessage: 'TimeoutError: locator.click: Timeout 10000ms exceeded.',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
        id: 'test-id-1213',
        target: 'local-serverless-observability_complete',
        location: '/path/to/test.ts',
        duration: 5000,
        owners: 'team:test',
      }
    );

    const comment = api.addIssueComment.mock.calls[0][1] as string;
    expect(comment).toContain('New failure for "local-serverless-observability_complete" target');
    expect(comment).toContain('New error message');
    expect(comment).toContain('TimeoutError: locator.click: Timeout 10000ms exceeded.');
  });
});

describe('createFailureIssue() - Scout failures', () => {
  it('creates new github issue with Scout-specific details and labels', async () => {
    const api = new GithubApi();

    await createFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test name',
        failure: 'this is the scout failure text',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
        id: 'test-id-123',
        target: 'local-serverless-observability_complete',
        location: '/path/to/test.ts',
        duration: 5000,
        owners: 'team:test',
        commandLine: 'npx playwright test --config config.ts',
      },
      api,
      'main',
      'kibana-on-merge'
    );

    expect(api.createIssue).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            "Failing test: scout.suite - scout test name",
            "A test failed on a tracked branch

      **Scout Test Details:**

      | Field | Value |
      |-------|-------|
      | Test ID | test-id-123 |
      | Target | local-serverless-observability_complete |
      | Location | /path/to/test.ts |
      | Duration | 5.00s |
      | Module | N/A |
      | Config path | config.ts |
      | Code Owners | team:test |

      \`\`\`
      this is the scout failure text
      \`\`\`

      First failure: [kibana-on-merge - main](https://build-url)

      <!-- kibanaCiData = {\\"failed-test\\":{\\"test.class\\":\\"scout.suite\\",\\"test.name\\":\\"scout test name\\",\\"test.failCount\\":1,\\"test.type\\":\\"scout\\"}} -->",
            Array [
              "failed-test",
              "scout-playwright",
            ],
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('creates Scout issue with kibanaModule information', async () => {
    const api = new GithubApi();

    await createFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test name',
        failure: 'scout failure',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
        id: 'test-id-456',
        target: 'serverless=es',
        location: '/path/to/test.ts',
        duration: 3000,
        owners: 'team:test',
        commandLine: 'npx playwright test',
        kibanaModule: {
          id: 'test-module',
          type: 'plugin',
          visibility: 'public',
          group: 'test-group',
        },
      },
      api,
      'main',
      'kibana-on-merge'
    );

    const callArgs = api.createIssue.mock.calls[0];
    const body = callArgs[1];
    expect(body).toContain('| Module | test-module (plugin) |');
    expect(body).toContain('"test.type":"scout"');
    expect(callArgs[2]).toEqual(['failed-test', 'scout-playwright']);
  });

  it('creates Scout issue with screenshot information when attachments are available', async () => {
    const api = new GithubApi();

    await createFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test name',
        failure: 'scout failure',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
        id: 'test-id-789',
        target: 'local-serverless-observability_complete',
        location: '/path/to/test.ts',
        duration: 2000,
        owners: 'team:test',
        attachments: [
          {
            name: 'screenshot.png',
            contentType: 'image/png',
          },
        ],
      },
      api,
      'main',
      'kibana-on-merge'
    );

    const callArgs = api.createIssue.mock.calls[0];
    const body = callArgs[1];
    expect(body).toContain(
      'Failure screenshots are available in the Buildkite HTML report and artifacts.'
    );
  });

  it('does not include screenshot information when no image attachments', async () => {
    const api = new GithubApi();

    await createFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test name',
        failure: 'scout failure',
        time: '2018-01-01T01:00:00Z',
        likelyIrrelevant: false,
        id: 'test-id-789',
        target: 'local-serverless-observability_complete',
        location: '/path/to/test.ts',
        duration: 2000,
        owners: 'team:test',
        attachments: [
          {
            name: 'trace.zip',
            contentType: 'application/zip',
          },
        ],
      },
      api,
      'main',
      'kibana-on-merge'
    );

    const callArgs = api.createIssue.mock.calls[0];
    const body = callArgs[1];
    expect(body).not.toContain(
      'Failure screenshots are available in the Buildkite HTML report and artifacts.'
    );
  });
});
