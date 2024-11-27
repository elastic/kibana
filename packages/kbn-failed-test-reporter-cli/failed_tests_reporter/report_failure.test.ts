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
});
