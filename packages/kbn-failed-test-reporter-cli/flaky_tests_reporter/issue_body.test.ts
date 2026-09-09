/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  flakySuiteIssueTitle,
  readReportCount,
  readSuiteFilePath,
  renderFlakySuiteIssueBody,
  renderReopenComment,
  type FlakySuiteIssueContext,
} from './issue_body';
import { groupIntoSuites } from './suites';
import { flakyReport, flakyTest, SUITE_PATH } from './test_fixtures';

const suiteOf = (...tests: ReturnType<typeof flakyTest>[]) => groupIntoSuites(tests)[0];

const context = (
  tests: ReturnType<typeof flakyTest>[],
  overrides: Partial<FlakySuiteIssueContext> = {}
): FlakySuiteIssueContext => ({
  report: flakyReport(tests),
  relatedIssues: [],
  reportCount: 1,
  ...overrides,
});

describe('flakySuiteIssueTitle', () => {
  it('names the suite by its file', () => {
    expect(flakySuiteIssueTitle({ filePath: SUITE_PATH })).toBe(`Flaky test suite: ${SUITE_PATH}`);
  });
});

describe('renderFlakySuiteIssueBody', () => {
  it('renders the impact statement, tables, samples and metadata footer', () => {
    const tests = [
      flakyTest(),
      flakyTest({
        testId: 'playwright:default_status_alert:bulk',
        title: 'applies a maintenance | window in bulk',
        failedBuilds: 11,
        buildFailRate: 11 / 509,
        retryFlakes: 4,
        sampleFailures: [],
      }),
    ];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), {
      ...context(tests),
      reportUrl: 'https://buildkite.com/elastic/kibana-scout-report-flaky-tests/builds/42',
      reportCount: 3,
    });

    expect(body).toMatchSnapshot();
    // Pipes in test titles must not break the markdown table
    expect(body).toContain('| applies a maintenance \\| window in bulk | 11/509 | 2.2% | 4 |');
    expect(body).toContain('[flaky_tests.json](https://buildkite.com/elastic/kibana-scout-report-flaky-tests/builds/42)');
    expect(body).toContain('| Reports flagging this suite | 3 |');
    expect(readSuiteFilePath(body)).toBe(SUITE_PATH);
    expect(readReportCount(body)).toBe(3);
  });

  it('uses singular wording for a single test and omits the config path row when unknown', () => {
    const tests = [flakyTest({ configPath: undefined })];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), context(tests));

    expect(body).toContain('A test in this suite was flaky on `kibana-on-merge`');
    expect(body).toContain('It failed in **49 of 509 builds** (9.6%)');
    expect(body).not.toContain('| Config path |');
    expect(body).toContain('generated 2026-09-09 09:04 UTC');
  });

  it('lists related failed-test issues when given', () => {
    const tests = [flakyTest()];
    const body = renderFlakySuiteIssueBody(
      suiteOf(...tests),
      context(tests, {
        relatedIssues: [
          {
            number: 123,
            html_url: 'https://github.com/elastic/kibana/issues/123',
            title: 'Failing test: some test',
          },
        ],
      })
    );

    expect(body).toContain('**Related `failed-test` issues**');
    expect(body).toContain('- [#123](https://github.com/elastic/kibana/issues/123) Failing test: some test');
  });

  it('redacts sensitive text in failure samples and fences them so embedded fences cannot escape', () => {
    const tests = [
      flakyTest({
        sampleFailures: [
          {
            message: 'Error: ```\nfixture-user@elastic.co could not reach https://abc.qa.elastic.cloud\n```',
            buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12345',
            timestamp: new Date('2026-09-09T06:12:00.000Z'),
          },
        ],
      }),
    ];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), context(tests));

    expect(body).toContain('[kibana-on-merge #12345](https://buildkite.com/elastic/kibana-on-merge/builds/12345) · 2026-09-09 06:12 UTC');
    expect(body).toContain('<redacted>@elastic.co');
    expect(body).not.toContain('abc.qa.elastic.cloud');
    expect(body).toContain('````\nError: ```');
  });

  it('drops failure samples when the body would exceed the GitHub size limit', () => {
    const tests = Array.from({ length: 5 }, (_, index) =>
      flakyTest({
        testId: `test-${index}`,
        title: `test ${index}`,
        sampleFailures: Array.from({ length: 10 }, () => ({
          message: 'x'.repeat(1500),
          timestamp: new Date('2026-09-09T06:12:00.000Z'),
        })),
      })
    );
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), context(tests));

    expect(body.length).toBeLessThan(60_000);
    expect(body).not.toContain('<details>');
    expect(body).toContain('**Impact per test**');
  });
});

describe('readSuiteFilePath / readReportCount', () => {
  it('ignore bodies without flaky-test-suite metadata', () => {
    const failedTestBody =
      'A test failed\n\n<!-- kibanaCiData = {"failed-test":{"test.class":"x","test.failCount":3}} -->';
    expect(readSuiteFilePath(failedTestBody)).toBeUndefined();
    expect(readReportCount(failedTestBody)).toBe(0);
  });
});

describe('renderReopenComment', () => {
  it('summarises the flare-up', () => {
    const tests = [flakyTest()];
    expect(renderReopenComment(suiteOf(...tests), flakyReport(tests))).toBe(
      'Flaky again: 1 test in this suite failed in the last 7 days, the worst in 49 of 509 builds (9.6%). The issue body has been updated with the latest numbers.'
    );
  });
});
