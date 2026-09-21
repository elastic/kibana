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
  rankTierLabel,
  readFlakySuiteIssueMetadata,
  readSuiteFilePathFromTitle,
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
        { branch: '9.2', builds: 64, failedBuilds: 3, buildFailRate: 3 / 64 },
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
  it('names the module, the framework and the suite title', () => {
    const { suite } = singleTestReport();
    expect(flakySuiteIssueTitle(suite, 'Synthetics')).toBe(
      '[Synthetics] Flaky Scout test suite: Default status alert'
    );
  });

  it('falls back to the file name without a suite title and omits an unknown module', () => {
    expect(
      flakySuiteIssueTitle({
        filePath: 'x-pack/test/a/b.ts',
        framework: 'ftr',
        suiteTitle: undefined,
      })
    ).toBe('Flaky FTR test suite: b.ts');
  });
});

describe('readSuiteFilePathFromTitle', () => {
  it('reads the file of a legacy title only', () => {
    expect(readSuiteFilePathFromTitle('Flaky Scout test suite: a/b/c.spec.ts')).toBe(
      'a/b/c.spec.ts'
    );
    expect(readSuiteFilePathFromTitle('  Flaky test suite:  x-pack/test/d.ts ')).toBe(
      'x-pack/test/d.ts'
    );
    expect(readSuiteFilePathFromTitle('[Lens] Flaky Scout test suite: c.spec.ts')).toBeUndefined();
    expect(readSuiteFilePathFromTitle('Flaky Scout test suite: two words')).toBeUndefined();
    expect(readSuiteFilePathFromTitle('Failing test: Discover - should load')).toBeUndefined();
  });
});

describe('rankTierLabel', () => {
  it('names the smallest top-N tier the worst test falls in', () => {
    const { suite, report } = singleTestReport();
    expect(rankTierLabel(suite.tests[0], report)).toBe('in the top 5 flakiest tests');

    const multi = multiTestReport();
    expect(rankTierLabel(multi.suite.tests[0], multi.report)).toBe('in the top 30 flakiest tests');
  });

  it('falls back to the report total beyond the top 100', () => {
    const many = Array.from({ length: 120 }, (_, index) =>
      flakyTest({ testId: `t${index}`, failedBuilds: 200 - index })
    );
    const report = flakyReport(many);
    expect(rankTierLabel(many[119], report)).toBe('among the 120 flakiest tests');
    expect(
      rankTierLabel(many[119], { ...report, thresholds: { ...report.thresholds, maxTests: 120 } })
    ).toBe('among the 120+ flakiest tests');
  });
});

describe('renderFlakySuiteIssueBody', () => {
  it('renders a single-test suite with a dashboard link', () => {
    const { suite, report } = singleTestReport();
    expect(
      renderFlakySuiteIssueBody(suite, { report, dashboardUrl: 'https://dashboard.example' })
    ).toMatchSnapshot();
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
