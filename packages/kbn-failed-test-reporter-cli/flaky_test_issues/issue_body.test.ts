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
  readFlakySuiteIssueMetadata,
  renderFlakySuiteIssueBody,
} from './issue_body';
import { groupIntoSuites } from './suites';
import { flakyReport, flakyTest, pipelineStats, SUITE_PATH } from './test_fixtures';

const singleTestReport = () => {
  const report = flakyReport(
    [flakyTest()],
    [
      {
        filePath: SUITE_PATH,
        framework: 'playwright',
        testIds: [flakyTest().testId],
        byPipeline: [
          pipelineStats({
            pipeline: 'kibana-pull-request',
            builds: 661,
            failedBuilds: 70,
            buildFailRate: 70 / 661,
            failedBranches: 64,
            lastFailedAt: new Date('2026-09-08T16:05:00.000Z'),
            lastFailedBuildUrl: 'https://buildkite.com/elastic/kibana-pull-request/builds/498441',
          }),
          pipelineStats(),
          pipelineStats({
            pipeline: 'kibana-elasticsearch-snapshot-verify',
            builds: 5,
            failedBuilds: 1,
            buildFailRate: 0.2,
            lastFailedBuildUrl: undefined,
          }),
        ],
      },
    ]
  );
  const [suite] = groupIntoSuites(report.flaky, report.files);
  return { report, suite };
};

const multiTestReport = () => {
  const tests = [
    flakyTest({
      testId: 'a',
      title: 'does not keep a hidden histogram after visiting Dashboard',
      failedBuilds: 23,
      builds: 264,
      buildFailRate: 23 / 264,
      byBranch: [
        {
          branch: 'main',
          builds: 200,
          failedBuilds: 20,
          buildFailRate: 0.1,
          latestRun: { status: 'skipped', timestamp: new Date('2026-09-09T06:04:41.000Z') },
        },
        {
          branch: '9.2',
          builds: 64,
          failedBuilds: 3,
          buildFailRate: 3 / 64,
          lastFailedAt: new Date('2026-09-07T11:40:00.000Z'),
        },
        { branch: '9.1', builds: 58, failedBuilds: 0, buildFailRate: 0 },
      ],
      latestRun: {
        branch: 'main',
        status: 'skipped',
        timestamp: new Date('2026-09-09T06:04:41.000Z'),
      },
      sampleFailures: [
        {
          message: 'Error: expect(locator).toBeVisible() failed\n\nLocator: chart | pipe',
          buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199-abcd',
          timestamp: new Date('2026-09-09T06:12:00.000Z'),
        },
        {
          message: 'Error: expect(locator).toBeVisible() failed\n\nLocator: chart | pipe',
          buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12300',
          timestamp: new Date('2026-09-08T06:12:00.000Z'),
        },
      ],
    }),
    flakyTest({
      testId: 'b',
      title: 'reverts breakdown, interval, and visibility on a saved session',
      failedBuilds: 10,
      builds: 264,
      buildFailRate: 10 / 264,
      owners: ['elastic/kibana-data-discovery', 'elastic/other-team'],
      sampleFailures: [
        {
          message: 'TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.',
          buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12200',
          timestamp: new Date('2026-09-07T06:12:00.000Z'),
        },
      ],
    }),
    flakyTest({
      testId: 'c',
      title: 'persists hide/show of the histogram on a saved session',
      failedBuilds: 9,
      builds: 264,
      buildFailRate: 9 / 264,
      sampleFailures: [],
    }),
  ];
  // twenty other, worse, tests in other files push the suite down the ranking
  const others = Array.from({ length: 20 }, (_, index) =>
    flakyTest({ testId: `other-${index}`, filePath: `other_${index}.spec.ts`, failedBuilds: 100 })
  );
  const report = flakyReport([...others, ...tests]);
  const suite = groupIntoSuites(report.flaky, report.files).find(
    (candidate) => candidate.filePath === SUITE_PATH
  )!;
  return { report, suite };
};

describe('flakySuiteIssueTitle', () => {
  it('names the framework and the suite title', () => {
    const { suite } = singleTestReport();
    expect(flakySuiteIssueTitle(suite)).toBe('Flaky Scout suite: Default status alert');
  });

  it('cuts a suite title that would push the issue title past what GitHub accepts', () => {
    const { suite } = singleTestReport();
    const title = flakySuiteIssueTitle({ ...suite, suiteTitle: 'nested '.repeat(60).trim() });
    expect(title).toHaveLength(256);
    expect(title.startsWith('Flaky Scout suite: nested nested')).toBe(true);
    expect(title.endsWith('…')).toBe(true);
  });

  it('falls back to the file name without a suite title and omits an unknown module', () => {
    expect(
      flakySuiteIssueTitle({
        filePath: 'x-pack/test/a/b.ts',
        framework: 'ftr',
        suiteTitle: undefined,
      })
    ).toBe('Flaky FTR suite: b.ts');
  });
});

describe('renderFlakySuiteIssueBody', () => {
  it('opens by counting the tests and naming the suite, then the tests table', () => {
    const single = singleTestReport();
    expect(renderFlakySuiteIssueBody(single.suite, { report: single.report })).toContain(
      [
        '1 test in the `Default status alert` suite appears to be flaky:',
        '',
        '| Test | Flaky branches | Dashboard |',
      ].join('\n')
    );
    const multi = multiTestReport();
    expect(renderFlakySuiteIssueBody(multi.suite, { report: multi.report })).toContain(
      '3 tests in the `Default status alert` suite appear to be flaky:\n\n| Test |'
    );
  });

  it("lists every branch of the suite, failing ones first with the worst test's counts", () => {
    const { suite, report } = multiTestReport();
    expect(renderFlakySuiteIssueBody(suite, { report })).toContain(
      [
        '#### Failures by Branch',
        '',
        '| Branch | Failed builds | Last failure |',
        '|---|---|---|',
        '| 🔴 `main` | 49 / 509 (10%) | 2026-09-09 06:12 UTC |',
        '| 🔴 `9.2` | 3 / 64 (5%) | 2026-09-07 11:40 UTC |',
        '| ✅ `9.1` | 0 / 58 |',
      ].join('\n')
    );
  });

  it('renders a single-test suite', () => {
    const { suite, report } = singleTestReport();
    expect(renderFlakySuiteIssueBody(suite, { report })).toMatchSnapshot();
  });

  it('renders a multi-test suite with distinct failures, a skipped note and related issues', () => {
    const { suite, report } = multiTestReport();
    expect(renderFlakySuiteIssueBody(suite, { report, relatedIssues: [7, 8] })).toMatchSnapshot();
  });

  it('records the suite and the first report snapshot in the metadata', () => {
    const { suite, report } = singleTestReport();
    const body = renderFlakySuiteIssueBody(suite, { report });

    expect(readFlakySuiteIssueMetadata(body)).toEqual({
      'suite.filePath': SUITE_PATH,
      'suite.title': 'Default status alert',
      'suite.framework': 'playwright',
      'suite.testIds': [suite.tests[0].testId],
      'report.generatedAt': '2026-09-09T09:04:41.000Z',
      'report.count': 1,
      'report.history': [
        { generatedAt: '2026-09-09T09:04:41.000Z', builds: 509, failedBuilds: 49 },
      ],
    });
    expect(readFlakySuiteIssueMetadata('no metadata here')).toBeUndefined();
  });
});
