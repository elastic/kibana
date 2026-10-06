/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';

import {
  createFailureIssue,
  extractErrorMessage,
  redactSensitiveGithubFailureText,
  updateFailureIssue,
} from './report_failure';

jest.mock('./github_api');
const { GithubApi } = jest.requireMock('./github_api');

function createGithubApi(comments: Array<{ body: string }> = []) {
  const api = new GithubApi();
  api.getIssueComments.mockResolvedValue(comments);
  return api;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('redactSensitiveGithubFailureText()', () => {
  it('redacts @elastic.co emails, qa.elastic.cloud hosts, and console.qa.cld.elstc.co', () => {
    const input = dedent`
      Error: Failed to parse SAML response value.
      Most likely the 'fixture-user+alias@elastic.co' user has no access to the cloud deployment.
      Login to console.qa.cld.elstc.co with the user from '.ftr/role_users.json' file and try to load
      https://fixture-depl-abc123.kb.eu-west-1.aws.qa.elastic.cloud in the same window.
    `;

    const out = redactSensitiveGithubFailureText(input);

    expect(out).toContain('<redacted>@elastic.co');
    expect(out).not.toContain('fixture-user+alias@elastic.co');
    expect(out).toContain('Login to <redacted> with');
    expect(out).not.toContain('console.qa.cld.elstc.co');
    expect(out).toContain('<redacted>.qa.elastic.cloud');
    expect(out).not.toContain('fixture-depl-abc123');
  });

  it('redacts bare *.qa.elastic.cloud hostnames without a URL scheme', () => {
    expect(
      redactSensitiveGithubFailureText('open fake-sub.kb.eu-west-1.aws.qa.elastic.cloud in browser')
    ).toBe('open <redacted>.qa.elastic.cloud in browser');
  });

  it('redacts any *.found.no and *.elastic.co hosts and URLs', () => {
    expect(
      redactSensitiveGithubFailureText(
        'open https://fixture-staging.found.no/ then https://fixture-app.elastic.co/'
      )
    ).toBe('open <redacted>.found.no then <redacted>.elastic.co');
    expect(
      redactSensitiveGithubFailureText(
        'Login at fixture-staging.found.no or fixture-app.elastic.co'
      )
    ).toBe('Login at <redacted>.found.no or <redacted>.elastic.co');
    expect(redactSensitiveGithubFailureText('other https://fixture-api.found.no/x')).toBe(
      'other <redacted>.found.no'
    );
  });
});

describe('createFailureIssue()', () => {
  it('creates new github issue with a details table, failure text, link to issue, and valid metadata', async () => {
    const api = new GithubApi();

    await createFailureIssue(
      'https://build-url',
      {
        classname:
          'Chrome X-Pack UI Functional Tests.x-pack/platform/test/functional/apps/maps/sample_data·js',
        failure: 'this is the failure text',
        name: 'maps app maps loaded from sample data',
        time: '154.378',
        likelyIrrelevant: false,
        commandLine:
          'node scripts/functional_tests --config=x-pack/platform/test/functional/config.ts',
        owners: 'elastic/kibana-presentation',
        testType: 'ftr',
      },
      api,
      'main',
      'kibana-on-merge'
    );

    expect(api.createIssue).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            "Failing test: Chrome X-Pack UI Functional Tests.x-pack/platform/test/functional/apps/maps/sample_data·js - maps app maps loaded from sample data",
            "A test failed on a tracked branch

      **Test Details:**

      | Field | Value |
      |-------|-------|
      | Report name | Chrome X-Pack UI Functional Tests |
      | Location | x-pack/platform/test/functional/apps/maps/sample_data.js |
      | Duration | 154.38s |
      | Config path | x-pack/platform/test/functional/config.ts |
      | Code Owners | elastic/kibana-presentation |

      \`\`\`
      this is the failure text
      \`\`\`

      First failure: [kibana-on-merge - main](https://build-url)

      <!-- kibanaCiData = {\\"failed-test\\":{\\"test.class\\":\\"Chrome X-Pack UI Functional Tests.x-pack/platform/test/functional/apps/maps/sample_data·js\\",\\"test.name\\":\\"maps app maps loaded from sample data\\",\\"test.failCount\\":1,\\"test.type\\":\\"ftr\\"}} -->",
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

  it('uses an explicit file location without changing the failure identity', async () => {
    const api = new GithubApi();
    const classname = 'Jest Tests.x-pack/platform/example/tests';

    await createFailureIssue(
      'https://build-url',
      {
        classname,
        location: 'x-pack/platform/example/tests/example.test.ts',
        failure: 'this is the failure text',
        name: 'test name',
        time: '1.000',
        likelyIrrelevant: false,
        testType: 'jest',
      },
      api,
      'main',
      'kibana-on-merge'
    );

    const [title, body] = api.createIssue.mock.calls[0];
    expect(title).toContain(classname);
    expect(body).toContain('| Location | x-pack/platform/example/tests/example.test.ts |');
    expect(body).toContain(`"test.class":"${classname}"`);
  });

  it('normalizes multiple code owners in the details table', async () => {
    const api = new GithubApi();

    await createFailureIssue(
      'https://build-url',
      {
        classname: 'Jest Tests.x-pack/platform/example',
        failure: 'this is the failure text',
        name: 'test name',
        time: '1.000',
        likelyIrrelevant: false,
        owners: 'elastic/team-a,elastic/team-b',
      },
      api,
      'main',
      'kibana-on-merge'
    );

    const [, body] = api.createIssue.mock.calls[0];
    expect(body).toContain('| Code Owners | elastic/team-a, elastic/team-b |');
  });

  it('renders N/A for missing details and omits test.type when unknown', async () => {
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

      **Test Details:**

      | Field | Value |
      |-------|-------|
      | Report name | some |
      | Location | classname |
      | Duration | N/A |
      | Config path | N/A |
      | Code Owners | N/A |

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

    const [title, body] = api.createIssue.mock.calls[0];
    expect(title).toBe('Failing test: [MKI][QA] some.classname - test name');
    expect(body).toContain('**Test Details:**');
  });
});

describe('updateFailureIssue()', () => {
  it('increments failure count and adds new comment to issue', async () => {
    const api = createGithubApi();

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
    // without a failure object there is no message to compare, so the comment
    // history is not fetched at all
    expect(api.getIssueComments).not.toHaveBeenCalled();
  });

  it('includes new error message in FTR comment when the failure is new', async () => {
    const api = createGithubApi([
      { body: 'New failure: [kibana-on-merge - main](https://old-build-url)' },
    ]);

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

            \`\`\`
            Error: some other previous failure
              at old (/path/to/old.ts:1:1)
            \`\`\`

            <!-- kibanaCiData = {"failed-test":{"test.failCount":10}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'foo',
        name: 'test',
        failure:
          'Error: expected 200 "OK", got 503 "Service Unavailable"\n  at Test._assertStatus (/node_modules/supertest/lib/test.js:252:14)\n  at Test.assert (/node_modules/supertest/lib/test.js:148:18)',
        time: '1.000',
        likelyIrrelevant: false,
      }
    );

    const comment = api.addIssueComment.mock.calls[0][1] as string;
    // pin down the exact comment format: build link, blank line, message in a code block
    expect(comment).toBe(
      dedent`
        New failure: [kibana-on-merge - main](https://build-url)

        New error message:
        \`\`\`
        Error: expected 200 "OK", got 503 "Service Unavailable"
        \`\`\`
      `
    );
    // only the message is posted, not the stack trace
    expect(comment).not.toContain('at Test._assertStatus');
  });

  it('keeps FTR comment link-only when the failure text is empty', async () => {
    const api = createGithubApi();

    await updateFailureIssue(
      'https://build-url',
      {
        classname: 'foo',
        name: 'test',
        github: {
          htmlUrl: 'https://github.com/issues/1234',
          number: 1234,
          nodeId: 'abcd',
          body: '# existing issue body',
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'foo',
        name: 'test',
        failure: '',
        time: '1.000',
        likelyIrrelevant: false,
      }
    );

    // nothing to compare: no message block and no "already reported" claim
    expect(api.addIssueComment.mock.calls[0][1]).toBe(
      'New failure: [kibana-on-merge - main](https://build-url)'
    );
  });

  it('matches an error message reported in a later code block, not just the first one', async () => {
    const api = createGithubApi();

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

            \`\`\`
            Error: the original failure
            \`\`\`

            Edited by a human to add another observed error:

            \`\`\`
            Error: expected 200 "OK", got 503 "Service Unavailable"
            \`\`\`

            <!-- kibanaCiData = {"failed-test":{"test.failCount":10}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'foo',
        name: 'test',
        failure:
          'Error: expected 200 "OK", got 503 "Service Unavailable"\n  at Test._assertStatus (/node_modules/supertest/lib/test.js:252:14)',
        time: '1.000',
        likelyIrrelevant: false,
      }
    );

    expect(api.addIssueComment.mock.calls[0][1]).toBe(
      'New failure: [kibana-on-merge - main](https://build-url)\n\n' +
        'Error message matches a failure already reported on this issue.'
    );
  });

  it('redacts sensitive hosts and emails in the posted error message', async () => {
    const api = createGithubApi();

    await updateFailureIssue(
      'https://build-url',
      {
        classname: 'foo',
        name: 'test',
        github: {
          htmlUrl: 'https://github.com/issues/1234',
          number: 1234,
          nodeId: 'abcd',
          body: '# existing issue body',
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'foo',
        name: 'test',
        failure:
          'Error: fixture-user@elastic.co could not reach https://fixture-depl.kb.aws.qa.elastic.cloud\n  at login (login.ts:1:1)',
        time: '1.000',
        likelyIrrelevant: false,
      }
    );

    const comment = api.addIssueComment.mock.calls[0][1] as string;
    expect(comment).toContain('<redacted>@elastic.co');
    expect(comment).toContain('<redacted>.qa.elastic.cloud');
    expect(comment).not.toContain('fixture-user@elastic.co');
    expect(comment).not.toContain('fixture-depl');
  });

  it('notes an already reported error message when it matches the issue body', async () => {
    const api = createGithubApi();

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

            \`\`\`
            Error: expected 200 "OK", got 503 "Service Unavailable"
              at Test._assertStatus (/node_modules/supertest/lib/test.js:252:14)
            \`\`\`

            <!-- kibanaCiData = {"failed-test":{"test.failCount":10}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'foo',
        name: 'test',
        failure:
          'Error: expected 200 "OK", got 503 "Service Unavailable"\n  at Test._assertStatus (/node_modules/supertest/lib/test.js:252:14)',
        time: '1.000',
        likelyIrrelevant: false,
      }
    );

    expect(api.addIssueComment.mock.calls[0][1]).toBe(
      'New failure: [kibana-on-merge - main](https://build-url)\n\n' +
        'Error message matches a failure already reported on this issue.'
    );
  });

  it('notes an already reported error message when it was posted in a previous comment', async () => {
    const api = createGithubApi([
      { body: 'New failure: [kibana-on-merge - main](https://old-build-url)' },
      {
        body: dedent`
          New failure: [kibana-on-merge - main](https://old-build-url)

          New error message:
          \`\`\`
          Error: expected 200 "OK", got 503 "Service Unavailable"
          \`\`\`
        `,
      },
    ]);

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

            \`\`\`
            Error: some other previous failure
            \`\`\`

            <!-- kibanaCiData = {"failed-test":{"test.failCount":10}} -->"
          `,
        },
      },
      api,
      'main',
      'kibana-on-merge',
      {
        classname: 'foo',
        name: 'test',
        failure:
          'Error: expected 200 "OK", got 503 "Service Unavailable"\n  at Test._assertStatus (/node_modules/supertest/lib/test.js:252:14)',
        time: '1.000',
        likelyIrrelevant: false,
      }
    );

    expect(api.addIssueComment.mock.calls[0][1]).toBe(
      'New failure: [kibana-on-merge - main](https://build-url)\n\n' +
        'Error message matches a failure already reported on this issue.'
    );
  });

  it('adds comment with target information for Scout failures', async () => {
    const api = createGithubApi();

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
        commandLine: 'node scripts/playwright test --config=config.ts',
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
    const api = createGithubApi();

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
    // no message was available to compare, so no repeat note either
    expect(comment).not.toContain('already reported on this issue');
  });

  it('notes an already reported error message when error.message matches issue body', async () => {
    const api = createGithubApi();

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
    expect(comment).toContain('Error message matches a failure already reported on this issue.');
  });

  it('includes new error message when error.message changed', async () => {
    const api = createGithubApi();

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

    // pin down the exact comment format: target line, blank line, message in a code block
    expect(api.addIssueComment.mock.calls[0][1]).toBe(
      dedent`
        New failure for "local-serverless-observability_complete" target: [kibana-on-merge - main](https://build-url)

        New error message:
        \`\`\`
        TimeoutError: locator.click: Timeout 10000ms exceeded.
        \`\`\`
      `
    );
  });

  it('notes an already reported error message when it was posted in a previous Scout comment', async () => {
    const api = createGithubApi([
      {
        body: dedent`
          New failure for "local-serverless-observability_complete" target: [kibana-on-merge - main](https://old-build-url)

          New error message:
          \`\`\`
          TimeoutError: locator.click: Timeout 10000ms exceeded.
          \`\`\`
        `,
      },
    ]);

    await updateFailureIssue(
      'https://build-url',
      {
        classname: 'scout.suite',
        name: 'scout test',
        github: {
          htmlUrl: 'https://github.com/issues/1415',
          number: 1415,
          nodeId: 'uvwx',
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
        id: 'test-id-1415',
        target: 'local-serverless-observability_complete',
        location: '/path/to/test.ts',
        duration: 5000,
        owners: 'team:test',
      }
    );

    const comment = api.addIssueComment.mock.calls[0][1] as string;
    expect(comment).toContain('New failure for "local-serverless-observability_complete" target');
    expect(comment).not.toContain('New error message');
    expect(comment).toContain('Error message matches a failure already reported on this issue.');
  });
});

describe('extractErrorMessage()', () => {
  it('returns the text before the first stack-frame line', () => {
    const failure = dedent`
      Error: retry.tryWithRetries reached the limit of attempts
      waiting for element to be visible
        at onFailure (retry_for_success.ts:17:9)
        at retryForSuccess (retry_for_success.ts:59:13)
    `;

    expect(extractErrorMessage(failure)).toBe(
      'Error: retry.tryWithRetries reached the limit of attempts\nwaiting for element to be visible'
    );
  });

  it('returns the full text when there are no stack-frame lines', () => {
    expect(extractErrorMessage('some failure text without a stack\nsecond line')).toBe(
      'some failure text without a stack\nsecond line'
    );
  });

  it('falls back to the full text when the blob starts with stack frames', () => {
    const failure = '  at onFailure (retry_for_success.ts:17:9)\n  at retryForSuccess (rfs.ts:5:1)';
    expect(extractErrorMessage(failure)).toBe(failure.trim());
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
        commandLine: 'node scripts/playwright test --config config.ts',
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
        commandLine: 'node scripts/playwright test',
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
