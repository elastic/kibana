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
  MAX_HISTORY_ENTRIES,
  readReportCount,
  readReportHistory,
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
  history: [],
  ...overrides,
});

describe('flakySuiteIssueTitle', () => {
  it('names the suite by its file', () => {
    expect(flakySuiteIssueTitle({ filePath: SUITE_PATH })).toBe(`Flaky test suite: ${SUITE_PATH}`);
  });
});

describe('renderFlakySuiteIssueBody', () => {
  it('renders the headline, trend, tables, samples and metadata footer', () => {
    const bulk = flakyTest({
      testId: 'playwright:default_status_alert:bulk',
      title: 'applies a maintenance | window in bulk',
      failedBuilds: 11,
      buildFailRate: 11 / 509,
      retryFlakes: 4,
      sampleFailures: [],
      byBranch: [
        { branch: 'main', builds: 400, failedBuilds: 8, buildFailRate: 0.02 },
        { branch: '9.1', builds: 109, failedBuilds: 3, buildFailRate: 3 / 109 },
      ],
    });
    // A worse test elsewhere in the report, so the suite is not ranked first
    const other = flakyTest({ testId: 'other', filePath: 'other.spec.ts', failedBuilds: 80 });
    const tests = [flakyTest(), bulk];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), {
      ...context(tests, {
        report: flakyReport([other, ...tests], {
          summary: { totalFlaky: 148, totalConsistentlyFailing: 0, flakyByFramework: {} },
        }),
      }),
      reportUrl: 'https://buildkite.com/elastic/kibana-scout-report-flaky-tests/builds/42',
      reportCount: 3,
      history: [
        { generatedAt: '2026-09-07T09:04:41.000Z', builds: 480, failedBuilds: 10 },
        { generatedAt: '2026-09-08T09:04:41.000Z', builds: 495, failedBuilds: 30 },
      ],
    });

    expect(body).toMatchSnapshot();
    expect(body).toContain(
      '> **2 flaky tests** in this file; the worst is **#2 of 148** flaky tests on `kibana-on-merge` in the last 7 days. It failed **49 of 509 builds (9.6%)**, last on 2026-09-09 06:12 UTC. Fails on `main`, `9.1`.'
    );
    expect(body).toContain(
      '> Flagged by **3 reports** so far, fail rate 2.1% → 6.1% → **9.6%** (rising).'
    );
    // Pipes in test titles must not break the markdown table
    expect(body).toContain('| applies a maintenance \\| window in bulk | 11/509 | 2.2% | 4 |');
    expect(body).toContain(
      '[flaky_tests.json](https://buildkite.com/elastic/kibana-scout-report-flaky-tests/builds/42), generated 2026-09-09 09:04 UTC'
    );
    expect(readSuiteFilePath(body)).toBe(SUITE_PATH);
    expect(readReportCount(body)).toBe(3);
    expect(readReportHistory(body)).toHaveLength(3);
  });

  it('renders a single test without rank table or trend and omits the config row when unknown', () => {
    const tests = [flakyTest({ configPath: undefined })];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), context(tests));

    expect(body).toContain(
      '> **#1 of 1** flaky tests on `kibana-on-merge` in the last 7 days. Failed **49 of 509 builds (9.6%)**, last on 2026-09-09 06:12 UTC. Fails on `main`.'
    );
    expect(body).toContain(
      '| Test | creates default alert, triggers on down status, and recovers |'
    );
    expect(body).not.toContain('Flagged by');
    expect(body).not.toContain('**Flaky tests**');
    expect(body).not.toContain('| Config |');
    expect(body).toContain('<summary>Recent failures (1 sample)</summary>');
    expect(body).toContain('Source: flaky test report generated 2026-09-09 09:04 UTC');
  });

  it('marks the rank denominator as a lower bound when the report hit its size cap', () => {
    const tests = [flakyTest()];
    const body = renderFlakySuiteIssueBody(
      suiteOf(...tests),
      context(tests, {
        report: flakyReport(tests, {
          thresholds: { minBuilds: 10, minFailedBuilds: 2, maxTests: 1 },
        }),
      })
    );
    expect(body).toContain('> **#1 of 1+** flaky tests');
  });

  it('collapses identical failure samples into one block listing their builds', () => {
    const failure = (build: number, minute: number) => ({
      message: 'Error: element(s) not found',
      buildUrl: `https://buildkite.com/elastic/kibana-on-merge/builds/${build}`,
      timestamp: new Date(`2026-09-09T06:${String(minute).padStart(2, '0')}:00.000Z`),
    });
    const tests = [
      flakyTest({
        sampleFailures: [
          failure(3, 12),
          failure(3, 9),
          failure(2, 5),
          { message: 'Error: something else', timestamp: new Date('2026-09-08T06:00:00.000Z') },
        ],
      }),
    ];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), context(tests));

    expect(body).toContain('<summary>Recent failures (4 samples, 2 distinct errors)</summary>');
    expect(body).toContain(
      '[kibana-on-merge #3](https://buildkite.com/elastic/kibana-on-merge/builds/3), [kibana-on-merge #2](https://buildkite.com/elastic/kibana-on-merge/builds/2) · latest 2026-09-09 06:12 UTC\n\n````\nError: element(s) not found\n````'
    );
    expect(body).toContain('build · 2026-09-08 06:00 UTC\n\n````\nError: something else\n````');
  });

  it('caps the history kept in the metadata footer', () => {
    const tests = [flakyTest()];
    const history = Array.from({ length: MAX_HISTORY_ENTRIES + 3 }, (_, index) => ({
      generatedAt: `2026-08-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
      builds: 500,
      failedBuilds: 10 + index,
    }));
    const body = renderFlakySuiteIssueBody(
      suiteOf(...tests),
      context(tests, { reportCount: history.length + 1, history })
    );

    const kept = readReportHistory(body);
    expect(kept).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(kept[kept.length - 1].generatedAt).toBe('2026-09-09T09:04:41.000Z');
    expect(kept[0].generatedAt).toBe(history[history.length - MAX_HISTORY_ENTRIES + 1].generatedAt);
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
    expect(body).toContain(
      '- [#123](https://github.com/elastic/kibana/issues/123) Failing test: some test'
    );
  });

  it('redacts sensitive text in failure samples and fences them so embedded fences cannot escape', () => {
    const tests = [
      flakyTest({
        sampleFailures: [
          {
            message:
              'Error: ```\nfixture-user@elastic.co could not reach https://abc.qa.elastic.cloud\n```',
            buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12345',
            timestamp: new Date('2026-09-09T06:12:00.000Z'),
          },
        ],
      }),
    ];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), context(tests));

    expect(body).toContain(
      '[kibana-on-merge #12345](https://buildkite.com/elastic/kibana-on-merge/builds/12345) · 2026-09-09 06:12 UTC'
    );
    expect(body).toContain('<redacted>@elastic.co');
    expect(body).not.toContain('abc.qa.elastic.cloud');
    expect(body).toContain('````\nError: ```');
  });

  it('drops failure samples when the body would exceed the GitHub size limit', () => {
    const tests = Array.from({ length: 5 }, (_, index) =>
      flakyTest({
        testId: `test-${index}`,
        title: `test ${index}`,
        sampleFailures: Array.from({ length: 10 }, (__, sample) => ({
          message: `${sample} ${'x'.repeat(1500)}`,
          timestamp: new Date('2026-09-09T06:12:00.000Z'),
        })),
      })
    );
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), context(tests));

    expect(body.length).toBeLessThan(60_000);
    expect(body).not.toContain('<details>');
    expect(body).toContain('**Flaky tests**');
  });
});

describe('readSuiteFilePath / readReportCount / readReportHistory', () => {
  it('ignore bodies without flaky-test-suite metadata', () => {
    const failedTestBody =
      'A test failed\n\n<!-- kibanaCiData = {"failed-test":{"test.class":"x","test.failCount":3}} -->';
    expect(readSuiteFilePath(failedTestBody)).toBeUndefined();
    expect(readReportCount(failedTestBody)).toBe(0);
    expect(readReportHistory(failedTestBody)).toEqual([]);
  });

  it('drops malformed history entries', () => {
    const body =
      'Body\n\n<!-- kibanaCiData = {"flaky-test-suite":{"report.history":[{"generatedAt":"2026-09-01T00:00:00.000Z","builds":10,"failedBuilds":2},{"builds":"x"},null]}} -->';
    expect(readReportHistory(body)).toEqual([
      { generatedAt: '2026-09-01T00:00:00.000Z', builds: 10, failedBuilds: 2 },
    ]);
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
