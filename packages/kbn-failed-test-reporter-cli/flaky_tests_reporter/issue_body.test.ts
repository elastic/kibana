/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flakySuiteIssueTitle, readSuiteFilePath, renderFlakySuiteIssueBody } from './issue_body';
import { groupIntoSuites } from './suites';
import { flakyReport, flakyTest, SUITE_PATH } from './test_fixtures';

const suiteOf = (...tests: ReturnType<typeof flakyTest>[]) => groupIntoSuites(tests)[0];

describe('flakySuiteIssueTitle', () => {
  it('names the suite by its framework and file', () => {
    expect(flakySuiteIssueTitle({ filePath: SUITE_PATH, framework: 'playwright' })).toBe(
      `Flaky Scout test suite: ${SUITE_PATH}`
    );
    expect(flakySuiteIssueTitle({ filePath: 'a/b.test.ts', framework: 'jest' })).toBe(
      'Flaky Jest test suite: a/b.test.ts'
    );
    expect(flakySuiteIssueTitle({ filePath: 'a/b.ts', framework: 'ftr' })).toBe(
      'Flaky FTR test suite: a/b.ts'
    );
  });
});

describe('renderFlakySuiteIssueBody', () => {
  it('renders the headline, details, per-test table and metadata footer', () => {
    const bulk = flakyTest({
      testId: 'playwright:default_status_alert:bulk',
      title: 'applies a maintenance | window in bulk',
      failedBuilds: 11,
      buildFailRate: 11 / 509,
      byBranch: [
        { branch: 'main', builds: 400, failedBuilds: 8, buildFailRate: 0.02 },
        { branch: '9.1', builds: 109, failedBuilds: 3, buildFailRate: 3 / 109 },
      ],
    });
    // A worse test elsewhere in the report, so the suite is not ranked first
    const other = flakyTest({ testId: 'other', filePath: 'other.spec.ts', failedBuilds: 80 });
    const tests = [flakyTest(), bulk];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), {
      report: flakyReport([other, ...tests], {
        summary: { totalFlaky: 148, totalConsistentlyFailing: 0, flakyByFramework: {} },
      }),
      reportUrl: 'https://buildkite.com/elastic/kibana-scout-report-flaky-tests/builds/42',
    });

    expect(body).toMatchSnapshot();
    expect(body).toContain(
      '> **2 flaky tests** in this file; the worst is **#2 of 148** flaky tests on `kibana-on-merge` in the last 7 days. It failed **49 of 509 builds (9.6%)**, last on 2026-09-09 06:12 UTC. Fails on `main`, `9.1`.'
    );
    // Pipes in test titles must not break the markdown table
    expect(body).toContain('| applies a maintenance \\| window in bulk | 11/509 | 2.2% |');
    expect(body).toContain(
      '[flaky_tests.json](https://buildkite.com/elastic/kibana-scout-report-flaky-tests/builds/42), generated 2026-09-09 09:04 UTC'
    );
    expect(readSuiteFilePath(body)).toBe(SUITE_PATH);
  });

  it('renders a single test without the per-test table and omits the config row when unknown', () => {
    const tests = [flakyTest({ configPath: undefined })];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), { report: flakyReport(tests) });

    expect(body).toContain(
      '> **#1 of 1** flaky tests on `kibana-on-merge` in the last 7 days. Failed **49 of 509 builds (9.6%)**, last on 2026-09-09 06:12 UTC. Fails on `main`.'
    );
    expect(body).toContain(
      '| Test | creates default alert, triggers on down status, and recovers |'
    );
    expect(body).not.toContain('**Flaky tests**');
    expect(body).not.toContain('| Config |');
    expect(body).toContain('Source: flaky test report generated 2026-09-09 09:04 UTC');
  });

  it('marks the rank denominator as a lower bound when the report hit its size cap', () => {
    const tests = [flakyTest()];
    const body = renderFlakySuiteIssueBody(suiteOf(...tests), {
      report: flakyReport(tests, {
        thresholds: { minBuilds: 10, minFailedBuilds: 2, maxTests: 1 },
      }),
    });
    expect(body).toContain('> **#1 of 1+** flaky tests');
  });
});

describe('readSuiteFilePath', () => {
  it('ignores bodies without flaky-test-suite metadata', () => {
    const failedTestBody =
      'A test failed\n\n<!-- kibanaCiData = {"failed-test":{"test.class":"x","test.failCount":3}} -->';
    expect(readSuiteFilePath(failedTestBody)).toBeUndefined();
    expect(readSuiteFilePath('no metadata at all')).toBeUndefined();
  });
});
