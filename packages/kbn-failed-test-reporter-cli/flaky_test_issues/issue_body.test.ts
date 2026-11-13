/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlakyTestBranchStats } from '@kbn/scout-reporting';
import { updateIssueMetadata } from '../failed_tests_reporter/issue_metadata';
import {
  FLAKY_TEST_SUITE_METADATA_PREFIX,
  flakySuiteIssueTitle,
  lastPostedAt,
  readFlakySuiteIssueMetadata,
  refreshFlakySuiteIssueMetadata,
  renderFlakySuiteIssueBody,
  renderFlakySuiteIssueComment,
  type RecordedFlakySuiteIssueMetadata,
} from './issue_body';
import { groupIntoSuites } from './suites';
import { buildIds, flakyReport, flakyTest, pipelineStats, SUITE_PATH } from './test_fixtures';

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
            failedBranchNames: [
              'main',
              ...Array.from({ length: 63 }, (_, index) => `someone:branch-${index}`),
            ],
            lastFailedAt: new Date('2026-09-08T16:05:00.000Z'),
            lastFailedBuildUrl: 'https://buildkite.com/elastic/kibana-pull-request/builds/498441',
          }),
          pipelineStats(),
          pipelineStats({
            pipeline: 'kibana-elasticsearch-snapshot-verify',
            builds: 5,
            failedBuilds: 1,
            buildFailRate: 0.2,
            // a report written before the names were recorded
            failedBranchNames: undefined,
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
          lastFailedBuildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12290',
          lastFailedJobId: '0199-9200',
        },
        { branch: '9.1', builds: 58, failedBuilds: 0, buildFailRate: 0 },
      ],
      latestRun: {
        branch: 'main',
        status: 'skipped',
        timestamp: new Date('2026-09-09T06:04:41.000Z'),
      },
      byTarget: [
        // an older failure without a recorded build; the newest one, from another test, gets linked
        {
          mode: 'stateful-classic',
          type: 'local',
          builds: 200,
          failedBuilds: 20,
          buildFailRate: 0.1,
          lastFailedAt: new Date('2026-09-08T06:12:00.000Z'),
        },
        {
          mode: 'serverless-security_complete',
          type: 'cloud',
          builds: 64,
          failedBuilds: 3,
          buildFailRate: 3 / 64,
          lastFailedAt: new Date('2026-09-07T11:40:00.000Z'),
        },
        // a run that recorded no target
        { mode: 'unknown', type: 'local', builds: 5, failedBuilds: 1, buildFailRate: 0.2 },
      ],
      sampleFailures: [],
      errors: [
        {
          key: 'Error: expect(locator).toBeVisible() failed\n\nLocator: chart | pipe',
          message: 'Error: expect(locator).toBeVisible() failed\n\nLocator: chart | pipe',
          buildsCount: 20,
          byPipeline: [
            { pipeline: 'kibana-on-merge', buildsCount: 12, buildIds: buildIds('merge', 12) },
            { pipeline: 'kibana-pull-request', buildsCount: 8, buildIds: buildIds('pr', 8) },
          ],
          branches: ['main', 'someone:fix-it', 'other:thing'],
          targets: ['stateful-classic', 'serverless-security_complete'],
          firstFailedAt: new Date('2026-09-03T00:00:00.000Z'),
          lastFailedAt: new Date('2026-09-09T06:12:00.000Z'),
          lastFailedBuildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12345',
          lastFailedJobId: '0199-ef01',
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
      sampleFailures: [],
      errors: [
        // the same error as test a, merged into one entry; b's newer failure is the one linked
        {
          key: 'Error: expect(locator).toBeVisible() failed\n\nLocator: chart | pipe',
          message: 'Error: expect(locator).toBeVisible() failed\n\nLocator: chart | pipe\n\nfrom b',
          buildsCount: 3,
          // two of these builds also failed test a
          byPipeline: [
            {
              pipeline: 'kibana-on-merge',
              buildsCount: 3,
              buildIds: ['merge-1', 'merge-2', 'merge-13'],
            },
          ],
          branches: ['9.2'],
          targets: ['stateful-classic'],
          firstFailedAt: new Date('2026-09-01T00:00:00.000Z'),
          lastFailedAt: new Date('2026-09-09T12:00:00.000Z'),
          lastFailedBuildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12350',
          lastFailedJobId: '0199-b000',
        },
        {
          key: 'TimeoutError: page.waitForSelector: Timeout Nms exceeded.',
          message: 'TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.',
          buildsCount: 1,
          // a build in which b also failed with the error above
          byPipeline: [{ pipeline: 'kibana-on-merge', buildsCount: 1, buildIds: ['merge-13'] }],
          branches: ['main'],
          targets: ['unknown'],
          firstFailedAt: new Date('2026-09-07T06:12:00.000Z'),
          lastFailedAt: new Date('2026-09-07T06:12:00.000Z'),
          lastFailedBuildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12200',
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
      errors: [
        // seen on pull request builds only: someone's broken branch, not the suite's problem
        {
          key: 'TypeError: Cannot read properties of undefined',
          message: 'TypeError: Cannot read properties of undefined',
          buildsCount: 2,
          byPipeline: [
            { pipeline: 'kibana-pull-request', buildsCount: 2, buildIds: buildIds('pr', 2) },
          ],
          branches: ['someone:wip', 'pull/1234/head'],
          targets: ['stateful-classic'],
          firstFailedAt: new Date('2026-09-08T00:00:00.000Z'),
          lastFailedAt: new Date('2026-09-08T00:00:00.000Z'),
        },
      ],
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
  it('names the framework, what the config runs and the suite title', () => {
    const { suite } = singleTestReport();
    expect(flakySuiteIssueTitle(suite)).toBe('Flaky Scout UI suite: Default status alert');
  });

  it.each([
    ['playwright', 'api-test', 'Flaky Scout API suite: x'],
    ['ftr', 'ui-test', 'Flaky FTR UI suite: x'],
    ['ftr', 'api-test', 'Flaky FTR API suite: x'],
    ['jest', 'unit-test', 'Flaky Jest suite: x'],
    ['jest', 'unit-integration-test', 'Flaky Jest integration suite: x'],
    ['cypress', 'ui-test', 'Flaky Cypress suite: x'],
    ['playwright', 'unknown', 'Flaky Scout suite: x'],
    ['playwright', undefined, 'Flaky Scout suite: x'],
  ] as const)('%s · %s → %s', (framework, configCategory, expected) => {
    expect(
      flakySuiteIssueTitle({ filePath: 'a.ts', framework, suiteTitle: 'x', configCategory })
    ).toBe(expected);
  });

  it('cuts a suite title that would push the issue title past what GitHub accepts', () => {
    const { suite } = singleTestReport();
    const title = flakySuiteIssueTitle({ ...suite, suiteTitle: 'nested '.repeat(60).trim() });
    expect(title).toHaveLength(256);
    expect(title.startsWith('Flaky Scout UI suite: nested nested')).toBe(true);
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
        `1 test in the [\`Default status alert\`](https://github.com/elastic/kibana/blob/main/${SUITE_PATH}) suite appears to be flaky:`,
        '',
        '| Test | Flaky branches | Dashboard |',
      ].join('\n')
    );
    const multi = multiTestReport();
    expect(renderFlakySuiteIssueBody(multi.suite, { report: multi.report })).toContain(
      `3 tests in the [\`Default status alert\`](https://github.com/elastic/kibana/blob/main/${SUITE_PATH}) suite appear to be flaky:\n\n| Test |`
    );
  });

  it("lists every branch of the suite, failing ones first with the worst test's counts and the newest failure's job", () => {
    const { suite, report } = multiTestReport();
    expect(renderFlakySuiteIssueBody(suite, { report })).toContain(
      [
        '#### Status by Branch',
        '',
        '| Branch | Status | Failed builds | Sample failure |',
        '|---|---|---|---|',
        '| `main` | 🔴 Flaky | 49 / 509 (**10%**) | [#12345](https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199-abcd) · 2026-09-09 06:12 UTC |',
        '| `9.2` | 🔴 Flaky | 3 / 64 (**5%**) | [#12290](https://buildkite.com/elastic/kibana-on-merge/builds/12290#0199-9200) · 2026-09-07 11:40 UTC |',
        '| `9.1` | ✅ No failures | 0 / 58 |  |',
      ].join('\n')
    );
  });

  it('says whether the suite is flaky, has some failures, is skipped or is clean on main and each version branch, in that order', () => {
    const branch = (
      name: string,
      failedBuilds: number,
      skipped: boolean,
      overrides: Partial<FlakyTestBranchStats> = {}
    ): FlakyTestBranchStats => ({
      branch: name,
      builds: 100,
      failedBuilds,
      buildFailRate: failedBuilds / 100,
      skipped,
      ...overrides,
    });
    const report = flakyReport([
      flakyTest({
        testId: 'a',
        byBranch: [
          branch('main', 8, true, {
            lastFailedAt: new Date('2026-09-05T10:00:00.000Z'),
            latestExecutionAt: new Date('2026-09-07T14:21:00.000Z'),
          }),
          branch('9.5', 3, false, { lastFailedAt: new Date('2026-09-08T10:00:00.000Z') }),
          branch('9.4', 0, true, { builds: 0 }),
        ],
      }),
      flakyTest({
        testId: 'b',
        title: 'another test',
        byBranch: [
          branch('main', 0, true, { latestExecutionAt: new Date('2026-09-06T10:00:00.000Z') }),
          // skipped here, but test a still runs on 9.5
          branch('9.5', 0, true),
          branch('8.19', 0, false, { builds: 40 }),
          // a higher rate than 9.5, but too few builds to clear the thresholds
          branch('9.3', 2, false, {
            builds: 5,
            buildFailRate: 2 / 5,
            lastFailedAt: new Date('2026-09-04T10:00:00.000Z'),
          }),
          // feature and pull request branches are left out
          branch('fix/some-feature', 2, false, { builds: 2, buildFailRate: 1 }),
          branch('someone:fix-it', 5, false),
        ],
      }),
    ]);
    const [suite] = groupIntoSuites(report.flaky, report.files);

    expect(renderFlakySuiteIssueBody(suite, { report })).toContain(
      [
        '| Branch | Status | Failed builds | Sample failure |',
        '|---|---|---|---|',
        '| `9.5` | 🔴 Flaky | 3 / 100 (**3%**) | 2026-09-08 10:00 UTC |',
        '| `9.3` | 🟠 Some failures | 2 / 5 (**40%**) | 2026-09-04 10:00 UTC |',
        '| `main` | ⏭️ Skipped, last ran 7 Sep | 8 / 100 (**8%**) | 2026-09-05 10:00 UTC |',
        '| `9.4` | ⏭️ Skipped in every run | 0 / 0 |  |',
        '| `8.19` | ✅ No failures | 0 / 40 |  |',
      ].join('\n')
    );
  });

  it('marks a branch flaky when any test is flaky there, with the worst test counts', () => {
    const report = flakyReport([
      // the most failed builds on main, but below the rate threshold
      flakyTest({
        testId: 'a',
        byBranch: [{ branch: 'main', builds: 200, failedBuilds: 4, buildFailRate: 4 / 200 }],
      }),
      flakyTest({
        testId: 'b',
        title: 'another test',
        byBranch: [{ branch: 'main', builds: 50, failedBuilds: 3, buildFailRate: 3 / 50 }],
      }),
    ]);
    const [suite] = groupIntoSuites(report.flaky, report.files);

    const body = renderFlakySuiteIssueBody(suite, { report });

    expect(body).toContain('| another test | **`main` 6% (3 / 50)** |');
    expect(body).toContain('| `main` | 🔴 Flaky | 4 / 200 (**2%**) |  |');
  });

  it('dates a failure without a recorded build, for reports written before it was', () => {
    const report = flakyReport([
      flakyTest({
        byBranch: [
          {
            branch: 'main',
            builds: 10,
            failedBuilds: 2,
            buildFailRate: 0.2,
            lastFailedAt: new Date('2026-09-09T06:12:00.000Z'),
          },
        ],
      }),
    ]);
    const [suite] = groupIntoSuites(report.flaky, report.files);
    expect(renderFlakySuiteIssueBody(suite, { report })).toContain(
      '| `main` | 🔴 Flaky | 2 / 10 (**20%**) | 2026-09-09 06:12 UTC |'
    );
  });

  it("lists every target of the suite, failing ones first with the worst test's counts, leaving runs without one out", () => {
    const { suite, report } = multiTestReport();
    expect(renderFlakySuiteIssueBody(suite, { report })).toContain(
      [
        '#### Failures by Target',
        '',
        '| Target | Environment | Failed builds | Sample failure |',
        '|---|---|---|---|',
        '| 🔴 `stateful-classic` | Local deployment | 49 / 509 (**10%**) | [#12345](https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199-abcd) · 2026-09-09 06:12 UTC |',
        '| 🔴 `serverless-security_complete` | MKI | 3 / 64 (**5%**) | 2026-09-07 11:40 UTC |',
        '| ✅ `serverless-observability_complete` | Local serverless simulation | 0 / 426 |  |',
      ].join('\n')
    );
  });

  it('names what the config runs in the suite details, unless unknown', () => {
    const single = singleTestReport();
    expect(renderFlakySuiteIssueBody(single.suite, { report: single.report })).toContain(
      '| **Framework** | Scout (Playwright) |\n| **Category** | UI test |\n| **File** |'
    );
    const report = flakyReport([flakyTest({ configCategory: 'unknown' })]);
    const [suite] = groupIntoSuites(report.flaky, report.files);
    expect(renderFlakySuiteIssueBody(suite, { report })).not.toContain('**Category**');
  });

  it('names the branches each pipeline failed on, collapsing pull request heads', () => {
    const { suite, report } = singleTestReport();
    const body = renderFlakySuiteIssueBody(suite, { report });
    expect(body).toContain('| 70 / 661 (**11%**) | `main`, 63 PRs | ');
    expect(body).toContain('| 49 / 509 (**10%**) | `main` | ');
    // the count, for a report written before the names were recorded
    expect(body).toContain('| 1 / 5 (**20%**) | 1 | ');
  });

  it('omits the target table when no test of the suite recorded a target', () => {
    const report = flakyReport([
      flakyTest({
        framework: 'jest',
        byTarget: [
          { mode: 'unknown', type: 'local', builds: 509, failedBuilds: 49, buildFailRate: 0.1 },
        ],
      }),
    ]);
    const [suite] = groupIntoSuites(report.flaky, report.files);
    const body = renderFlakySuiteIssueBody(suite, { report });
    expect(body).not.toContain('Failures by Target');
    expect(body).toContain('#### Status by Branch');
  });

  it("lists the suite's distinct errors merged across tests, most builds first, the first open and the rest collapsed under their share of failed builds", () => {
    const { suite, report } = multiTestReport();
    const body = renderFlakySuiteIssueBody(suite, { report });
    expect(body).toContain(
      '#### Failures by Error Message\n\n2 distinct errors:\n\n<details open>\n<summary><b>100% of failed builds</b>'
    );
    expect(body).toContain('</details>\n\n<details>\n<summary><b>5% of failed builds</b>');
    // 20 builds of test a and 3 of test b, two of which are a's: a build failing both counts once
    expect(body).toContain(
      '<summary><b>100% of failed builds</b> (21 of 21) · ' +
        '<code>Error: expect(locator).toBeVisible() failed</code> · 1–9 Sep 2026</summary>'
    );
    expect(body).toContain(
      [
        '| **Tests** | *does not keep a hidden histogram after visiting Dashboard*, *reverts breakdown, interval, and visibility on a saved session* |',
        '| **Pipelines** | `kibana-on-merge` (13), `kibana-pull-request` (8) |',
        '| **Branches** | `main`, `9.2`, 2 PRs |',
        '| **Targets** | `serverless-security_complete`, `stateful-classic` |',
        '| **Last seen** | [#12350](https://buildkite.com/elastic/kibana-on-merge/builds/12350#0199-b000) · 2026-09-09 12:00 UTC |',
      ].join('\n')
    );
    // the newest failure's message is the one shown, first thing inside the block
    expect(body).toContain(
      '</summary>\n\n```text\nError: expect(locator).toBeVisible() failed\n\nLocator: chart | pipe\n\nfrom b\n```\n\n| Field | Value |'
    );
    // its one build also hit the first error, so the shares add up to more than 100%; an unknown
    // target is not a target
    expect(body).toContain(
      '<summary><b>5% of failed builds</b> (1 of 21) · ' +
        '<code>TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.</code> · 7 Sep 2026</summary>'
    );
    expect(body).toContain(
      '| **Pipelines** | `kibana-on-merge` only |\n| **Branches** | `main` |\n| **Last seen** | [#12200]'
    );
    // the pull-request-only error is counted, not shown
    expect(body).not.toContain('Cannot read properties of undefined');
    expect(body).toContain('</details>\n\n*Errors that only appeared in PR builds were excluded.*');
  });

  it('keeps an error with no recorded branch, which cannot be shown to be pull request only', () => {
    const report = flakyReport([
      flakyTest({ errors: [{ ...flakyTest().errors[0], branches: [] }] }),
    ]);
    const body = renderFlakySuiteIssueBody(groupIntoSuites(report.flaky)[0], { report });
    expect(body).toContain('1 distinct error:\n\n<details open>');
    expect(body).toContain('| **Branches** | - |');
    expect(body).not.toContain('were excluded');
  });

  it('says so when every error was seen on pull request builds only', () => {
    const report = flakyReport([
      flakyTest({
        errors: [
          { ...flakyTest().errors[0], branches: ['a:x'] },
          { ...flakyTest().errors[0], key: 'other', branches: ['pull/7/head'] },
        ],
      }),
    ]);
    expect(renderFlakySuiteIssueBody(groupIntoSuites(report.flaky)[0], { report })).toContain(
      '### Failures\n\n#### Failures by Error Message\n\n*Errors that only appeared in PR builds were excluded.*\n\n#### Status by Branch'
    );
  });

  it('cuts the summary title and strips the JSON payload of Kibana client errors', () => {
    const message =
      'KbnClientRequesterError: [POST http://localhost:5620/api/fleet/agent_policies] 409 Conflict -- {"statusCode":409}\n' +
      'x'.repeat(200);
    const report = flakyReport([
      flakyTest({ errors: [{ ...flakyTest().errors[0], key: 'k', message }] }),
    ]);
    const [suite] = groupIntoSuites(report.flaky, report.files);
    expect(renderFlakySuiteIssueBody(suite, { report })).toContain(
      '<code>KbnClientRequesterError: [POST http://localhost:5620/api/fleet/agent_policies] 409 Conflict</code>'
    );
    const long = flakyReport([
      flakyTest({ errors: [{ ...flakyTest().errors[0], key: 'k', message: 'y'.repeat(200) }] }),
    ]);
    expect(renderFlakySuiteIssueBody(groupIntoSuites(long.flaky)[0], { report: long })).toContain(
      `<code>${'y'.repeat(109)}…</code>`
    );
  });

  it('caps the errors shown and says so when the report has none', () => {
    const errors = Array.from({ length: 6 }, (_, index) => ({
      ...flakyTest().errors[0],
      key: `k${index}`,
    }));
    const report = flakyReport([flakyTest({ errors })]);
    const body = renderFlakySuiteIssueBody(groupIntoSuites(report.flaky)[0], { report });
    expect(body.match(/<details open>/g)).toHaveLength(1);
    expect(body.match(/<details>/g)).toHaveLength(3);
    expect(body).toContain('and 2 more errors.');

    const none = flakyReport([flakyTest({ errors: [] })]);
    expect(renderFlakySuiteIssueBody(groupIntoSuites(none.flaky)[0], { report: none })).toContain(
      '### Failures\n\nNo failure messages were recorded for this suite.'
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

  it('names the closed issues it takes over from before the possibly related ones', () => {
    const { suite, report } = singleTestReport();
    const body = renderFlakySuiteIssueBody(suite, {
      report,
      relatedIssues: [9],
      supersededIssues: [7, 8],
    });

    const superseded = body.indexOf(
      'Previously tracked in #7, #8, closed before the suite failed again.'
    );
    expect(superseded).toBeGreaterThan(-1);
    expect(body.indexOf('Possibly related: #9.')).toBeGreaterThan(superseded);
    expect(renderFlakySuiteIssueBody(suite, { report, supersededIssues: [] })).not.toContain(
      'Previously tracked'
    );
  });

  it('records the suite and the first report snapshot in the metadata', () => {
    const { suite, report } = singleTestReport();
    const body = renderFlakySuiteIssueBody(suite, { report });

    expect(readFlakySuiteIssueMetadata(body)).toEqual({
      'suite.filePath': SUITE_PATH,
      'suite.title': 'Default status alert',
      'suite.framework': 'playwright',
      'suite.testIds': [suite.tests[0].testId],
      'suite.branches': ['main'],
      'suite.pipelines': ['kibana-on-merge'],
      'report.generatedAt': '2026-09-09T09:04:41.000Z',
      'report.count': 1,
      'report.history': [
        { generatedAt: '2026-09-09T09:04:41.000Z', builds: 509, failedBuilds: 49 },
      ],
      'report.shownTestIds': [suite.tests[0].testId],
    });
    expect(readFlakySuiteIssueMetadata('no metadata here')).toBeUndefined();
  });

  it('ends with how to skip the suite', () => {
    const { suite, report } = singleTestReport();

    expect(renderFlakySuiteIssueBody(suite, { report })).toMatch(
      /\n\n> \[!TIP\]\n> Review the failures\. .*`\/skip` it, or skip the test case manually\.\n\n<!-- kibanaCiData/
    );
  });

  it('records the branches to skip the suite on and the pipelines it failed on', () => {
    const branch = (name: string, failedBuilds: number) => ({
      branch: name,
      builds: 100,
      failedBuilds,
      buildFailRate: failedBuilds / 100,
    });
    const tests = [
      flakyTest({
        testId: 'a',
        byBranch: [
          branch('main', 2),
          branch('9.2', 8),
          branch('someone:fix-it', 9),
          branch('9.1', 0),
        ],
      }),
      flakyTest({ testId: 'b', title: 'another test', byBranch: [branch('main', 6)] }),
    ];
    const base = flakyReport(tests, [
      {
        filePath: SUITE_PATH,
        framework: 'playwright',
        testIds: ['a', 'b'],
        byPipeline: [
          pipelineStats({ lastFailedAt: new Date('2026-09-09T06:12:00.000Z') }),
          pipelineStats({
            pipeline: 'appex-qa-serverless-kibana-scout-tests',
            lastFailedAt: new Date('2026-09-08T06:12:00.000Z'),
          }),
          pipelineStats({ pipeline: 'kibana-pull-request' }),
          pipelineStats({ pipeline: 'appex-qa-stateful-kibana-scout-tests', failedBuilds: 0 }),
        ],
      },
    ]);
    const report = {
      ...base,
      scope: {
        ...base.scope,
        pipelines: [
          'kibana-on-merge',
          'appex-qa-serverless-kibana-scout-tests',
          'appex-qa-stateful-kibana-scout-tests',
        ],
      },
    };
    const [suite] = groupIntoSuites(report.flaky, report.files);

    const metadata = readFlakySuiteIssueMetadata(renderFlakySuiteIssueBody(suite, { report }));

    // by the worst test's failed builds on each branch; pull requests and clean branches left out
    expect(metadata?.['suite.branches']).toEqual(['9.2', 'main']);
    // out-of-scope and clean pipelines left out, the latest failure last
    expect(metadata?.['suite.pipelines']).toEqual([
      'appex-qa-serverless-kibana-scout-tests',
      'kibana-on-merge',
    ]);
  });
});

describe('refreshing a suite issue', () => {
  const previous: RecordedFlakySuiteIssueMetadata = {
    'suite.filePath': SUITE_PATH,
    'suite.title': 'Default status alert',
    'suite.framework': 'playwright',
    'suite.testIds': ['no-longer-flaky'],
    'suite.branches': ['9.3'],
    'suite.pipelines': ['kibana-on-merge', 'appex-qa-stateful-kibana-scout-tests'],
    'report.generatedAt': '2026-09-08T09:04:41.000Z',
    'report.count': 3,
    'report.history': [
      { generatedAt: '2026-09-07T09:04:41.000Z', builds: 400, failedBuilds: 20 },
      { generatedAt: '2026-09-08T09:04:41.000Z', builds: 450, failedBuilds: 25 },
    ],
  };

  /** The body as filed from an older report, with `previous` as its metadata. */
  const filedBody = (metadata: RecordedFlakySuiteIssueMetadata = previous) =>
    updateIssueMetadata(
      '1 test in the suite appears to be flaky:\n\n| Test | Flaky branches |\n|---|---|\n| creates default alert | **`main` 5% (20 / 400)** |',
      metadata,
      FLAKY_TEST_SUITE_METADATA_PREFIX
    );
  const textOf = (body: string) => body.replace(/\n\n<!-- kibanaCiData = .* -->$/, '');

  it('leaves the text as filed and only brings the metadata up to the report', () => {
    const { suite, report } = singleTestReport();

    const refreshed = refreshFlakySuiteIssueMetadata(filedBody(), suite, {
      report,
      previous,
      comment: false,
    });

    expect(textOf(refreshed)).toBe(textOf(filedBody()));
    expect(refreshed).not.toContain('49 / 509');
    expect(readFlakySuiteIssueMetadata(refreshed)?.['report.generatedAt']).toBe(
      '2026-09-09T09:04:41.000Z'
    );
  });

  it('keeps the test ids and branches it recorded and moves pipelines it no longer fails on first', () => {
    const { suite, report } = singleTestReport();

    const metadata = readFlakySuiteIssueMetadata(
      refreshFlakySuiteIssueMetadata(filedBody(), suite, { report, previous, comment: false })
    );

    expect(metadata).toEqual({
      ...previous,
      'suite.testIds': [suite.tests[0].testId, 'no-longer-flaky'],
      'suite.branches': ['main', '9.3'],
      'suite.pipelines': ['appex-qa-stateful-kibana-scout-tests', 'kibana-on-merge'],
      'report.generatedAt': '2026-09-09T09:04:41.000Z',
      'report.count': 4,
      'report.history': [
        ...previous['report.history'],
        { generatedAt: '2026-09-09T09:04:41.000Z', builds: 509, failedBuilds: 49 },
      ],
    });
  });

  it('records this report as the last comment when the refresh comments, else keeps the last one', () => {
    const { suite, report } = singleTestReport();
    const commented = { ...previous, 'report.commentedAt': '2026-09-08T09:04:41.000Z' };

    const commenting = readFlakySuiteIssueMetadata(
      refreshFlakySuiteIssueMetadata(filedBody(), suite, { report, previous, comment: true })
    );
    const silent = readFlakySuiteIssueMetadata(
      refreshFlakySuiteIssueMetadata(filedBody(commented), suite, {
        report,
        previous: commented,
        comment: false,
      })
    );

    expect(commenting?.['report.commentedAt']).toBe('2026-09-09T09:04:41.000Z');
    expect(silent?.['report.commentedAt']).toBe('2026-09-08T09:04:41.000Z');
  });

  it('adds the tests a comment shows to those the issue has shown, else keeps them as they are', () => {
    const { suite, report } = multiTestReport();
    const shown = { ...previous, 'report.shownTestIds': ['a', 'no-longer-flaky'] };
    const refresh = (metadata: RecordedFlakySuiteIssueMetadata, comment: boolean) =>
      readFlakySuiteIssueMetadata(
        refreshFlakySuiteIssueMetadata(filedBody(metadata), suite, {
          report,
          previous: metadata,
          comment,
        })
      )?.['report.shownTestIds'];

    expect(refresh(shown, true)).toEqual(['a', 'b', 'c', 'no-longer-flaky']);
    expect(refresh(shown, false)).toEqual(['a', 'no-longer-flaky']);
    // an issue filed before they were recorded starts with the tests of its next comment
    expect(refresh(previous, true)).toEqual(['a', 'b', 'c']);
    expect(refresh(previous, false)).toBeUndefined();
  });

  it('records as shown only the tests the comment names, so one it left out is newly flaky later', () => {
    const { suite, report } = multiTestReport();
    // b and c are flaky only on main, which is skipped: the comment names only a
    const skippedOnMain = {
      ...suite,
      tests: suite.tests.map((test) => ({
        ...test,
        byBranch: test.byBranch.map((stats) =>
          stats.branch === 'main' ? { ...stats, skipped: true } : stats
        ),
      })),
    };
    const shown = { ...previous, 'report.shownTestIds': ['a'] };

    const metadata = readFlakySuiteIssueMetadata(
      refreshFlakySuiteIssueMetadata(filedBody(shown), skippedOnMain, {
        report,
        previous: shown,
        comment: true,
      })
    );
    expect(metadata?.['report.shownTestIds']).toEqual(['a']);

    // main is no longer skipped: b and c are named for the first time
    const later = renderFlakySuiteIssueComment(suite, {
      report,
      reopened: false,
      previous: { ...shown, ...metadata },
    });
    expect(later).toContain(
      '`reverts breakdown, interval, and visibility on a saved session` (newly flaky)'
    );
    expect(later).toContain(
      '`persists hide/show of the histogram on a saved session` (newly flaky)'
    );
  });

  it('takes the report that filed the issue as the last one posted until a comment is recorded', () => {
    expect(lastPostedAt(previous)).toBe('2026-09-07T09:04:41.000Z');
    expect(lastPostedAt({ ...previous, 'report.commentedAt': '2026-09-08T09:04:41.000Z' })).toBe(
      '2026-09-08T09:04:41.000Z'
    );
    expect(lastPostedAt({ ...previous, 'report.history': [] })).toBeUndefined();
  });

  it('counts the reports of an issue filed before the count was recorded and caps the history', () => {
    const { suite, report } = singleTestReport();
    const history = Array.from({ length: 30 }, (_, day) => ({
      generatedAt: new Date(Date.UTC(2026, 7, day + 1)).toISOString(),
      builds: 100,
      failedBuilds: day,
    }));
    const uncounted = { ...previous, 'report.count': undefined, 'report.history': history };

    const metadata = readFlakySuiteIssueMetadata(
      refreshFlakySuiteIssueMetadata(filedBody(uncounted), suite, {
        report,
        previous: uncounted,
        comment: false,
      })
    );

    expect(metadata?.['report.count']).toBe(31);
    expect(metadata?.['report.history']).toHaveLength(30);
    expect(metadata?.['report.history'][0]).toEqual(history[1]);
    expect(metadata?.['report.history'][29].generatedAt).toBe('2026-09-09T09:04:41.000Z');
  });

  it('names the branch in the first line when it is a single one, and the test even when it is alone', () => {
    const { suite, report } = singleTestReport();

    expect(renderFlakySuiteIssueComment(suite, { report, reopened: false })).toBe(
      [
        'Still flaky on `main`:',
        '',
        '- `creates default alert, triggers on down status, and recovers`: 10% of builds (49 / 509), last failed [9 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199-abcd)',
      ].join('\n')
    );
    expect(renderFlakySuiteIssueComment(suite, { report, reopened: true })).toMatch(
      /^Flaky again after this issue was closed, on `main`:\n\n- `creates default alert/
    );
  });

  it("names the branches on the test's line when there are several", () => {
    const { suite, report } = multiTestReport();

    expect(
      renderFlakySuiteIssueComment(
        { ...suite, tests: [suite.tests[0]] },
        { report, reopened: false }
      )
    ).toBe(
      [
        'Still flaky:',
        '',
        '- `does not keep a hidden histogram after visiting Dashboard`: 10% of builds (20 / 200) on `main`, 5% of builds (3 / 64) on `9.2`, last failed [7 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/12290#0199-9200)',
      ].join('\n')
    );
  });

  it('names on each line only the branches that test is flaky on, highest rate first', () => {
    const failedOn = (branch: string, builds: number, failedBuilds: number, day: number) => ({
      branch,
      builds,
      failedBuilds,
      buildFailRate: failedBuilds / builds,
      lastFailedAt: new Date(Date.UTC(2026, 8, day)),
      lastFailedBuildUrl: `https://buildkite.com/elastic/kibana-on-merge/builds/${day}`,
    });
    const report = flakyReport([
      // a single failure on 8.19 is not flaky there
      flakyTest({
        testId: 'a',
        title: 'flaky on main',
        byBranch: [failedOn('main', 400, 20, 9), failedOn('8.19', 60, 1, 7)],
      }),
      flakyTest({
        testId: 'b',
        title: 'flaky on 8.19',
        byBranch: [
          { branch: 'main', builds: 400, failedBuilds: 0, buildFailRate: 0 },
          failedOn('8.19', 60, 5, 8),
        ],
      }),
    ]);
    const [suite] = groupIntoSuites(report.flaky, report.files);

    expect(renderFlakySuiteIssueComment(suite, { report, reopened: false })).toBe(
      [
        '2 tests still flaky:',
        '',
        '- `flaky on main`: 5% of builds (20 / 400) on `main`, last failed [9 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/9)',
        '- `flaky on 8.19`: 8% of builds (5 / 60) on `8.19`, last failed [8 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/8)',
      ].join('\n')
    );
  });

  it('leaves out the branches every test of the suite is skipped on, and the tests that only failed there', () => {
    const { suite, report } = multiTestReport();
    const skippedOnMain = {
      ...suite,
      tests: suite.tests.map((test) => ({
        ...test,
        byBranch: test.byBranch.map((stats) =>
          stats.branch === 'main' ? { ...stats, skipped: true } : stats
        ),
      })),
    };

    expect(renderFlakySuiteIssueComment(skippedOnMain, { report, reopened: false })).toBe(
      [
        'Still flaky on `9.2`:',
        '',
        '- `does not keep a hidden histogram after visiting Dashboard`: 5% of builds (3 / 64), last failed [7 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/12290#0199-9200)',
      ].join('\n')
    );
  });

  it("lists each test's own numbers on each branch, and says the suite is flaky again when the issue is reopened", () => {
    const { suite, report } = multiTestReport();

    // the clean 9.1 left out
    expect(renderFlakySuiteIssueComment(suite, { report, reopened: true })).toBe(
      [
        '3 tests flaky again after this issue was closed:',
        '',
        '- `does not keep a hidden histogram after visiting Dashboard`: 10% of builds (20 / 200) on `main`, 5% of builds (3 / 64) on `9.2`, last failed [7 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/12290#0199-9200)',
        '- `reverts breakdown, interval, and visibility on a saved session`: 10% of builds (49 / 509) on `main`, last failed [9 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199-abcd)',
        '- `persists hide/show of the histogram on a saved session`: 10% of builds (49 / 509) on `main`, last failed [9 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199-abcd)',
      ].join('\n')
    );
  });

  it('names the flaky tests the issue has not shown yet, and marks them as newly flaky', () => {
    const single = singleTestReport();
    const multi = multiTestReport();
    const shown = (ids: string[]) => ({ ...previous, 'report.shownTestIds': ids });

    expect(
      renderFlakySuiteIssueComment(single.suite, {
        report: single.report,
        reopened: false,
        previous: shown(['an-older-test']),
      })
    ).toBe(
      [
        'Still flaky on `main`:',
        '',
        '- `creates default alert, triggers on down status, and recovers` (newly flaky): 10% of builds (49 / 509), last failed [9 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199-abcd)',
      ].join('\n')
    );
    const lines = renderFlakySuiteIssueComment(multi.suite, {
      report: multi.report,
      reopened: false,
      previous: shown(['a']),
    }).split('\n');
    expect(lines[2]).toMatch(/^- `does not keep a hidden histogram after visiting Dashboard`: /);
    expect(lines[3]).toMatch(
      /^- `reverts breakdown, interval, and visibility on a saved session` \(newly flaky\): /
    );
    expect(lines[4]).toMatch(
      /^- `persists hide\/show of the histogram on a saved session` \(newly flaky\): /
    );
  });

  it('lists as many tests as the body does, then counts the rest', () => {
    const { suite, report } = singleTestReport();
    const [test] = suite.tests;
    const many = {
      ...suite,
      tests: Array.from({ length: 17 }, (_, i) => ({
        ...test,
        testId: `t${i}`,
        title: `test ${i}`,
      })),
    };

    const comment = renderFlakySuiteIssueComment(many, {
      report,
      reopened: false,
      previous: { ...previous, 'report.shownTestIds': [] },
    });

    expect(comment).toMatch(/\n- `test 14` \(newly flaky\): [^\n]+\n\nand 2 more tests\.$/);
    expect(comment).not.toContain('`test 15`');
  });

  describe('on an issue no report has found flaky yet, such as a consistently failing one', () => {
    const failing: RecordedFlakySuiteIssueMetadata = {
      'suite.filePath': SUITE_PATH,
      'suite.title': 'Default status alert',
      'suite.framework': 'playwright',
      'suite.testIds': ['broken-test'],
      'report.history': [],
    };

    it('says the suite is now flaky and names every flaky test', () => {
      const { suite, report } = singleTestReport();

      expect(
        renderFlakySuiteIssueComment(suite, { report, reopened: false, previous: failing })
      ).toBe(
        [
          'Now flaky on `main`:',
          '',
          '- `creates default alert, triggers on down status, and recovers`: 10% of builds (49 / 509), last failed [9 Sep](https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199-abcd)',
        ].join('\n')
      );
      expect(
        renderFlakySuiteIssueComment(suite, { report, reopened: true, previous: failing })
      ).toMatch(/^Now flaky, after this issue was closed, on `main`:\n\n- `creates default alert/);
    });

    it('counts the report as the first one, and records the tests it named', () => {
      const { suite, report } = singleTestReport();

      const metadata = readFlakySuiteIssueMetadata(
        refreshFlakySuiteIssueMetadata(filedBody(failing), suite, {
          report,
          previous: failing,
          comment: true,
        })
      );

      expect(metadata?.['report.count']).toBe(1);
      expect(metadata?.['report.shownTestIds']).toEqual([flakyTest().testId]);
      expect(metadata?.['suite.testIds']).toEqual([flakyTest().testId, 'broken-test']);
    });
  });

  it('marks no test as newly flaky when the issue has shown them all, or does not record which it has shown', () => {
    const { suite, report } = multiTestReport();

    for (const shownTestIds of [['a', 'b', 'c'], undefined]) {
      expect(
        renderFlakySuiteIssueComment(suite, {
          report,
          reopened: false,
          previous: { ...previous, 'report.shownTestIds': shownTestIds },
        })
      ).not.toContain('newly flaky');
    }
  });
});

describe('a suite flaky only in a pipeline judged on its own', () => {
  const [pooled] = flakyTest().byBranch;
  const fips = {
    ...pooled,
    pipeline: 'kibana-fips',
    builds: 14,
    failedBuilds: 4,
    buildFailRate: 4 / 14,
  };
  const [localTarget] = flakyTest().byTarget;
  const report = flakyReport([
    flakyTest({
      byBranch: [{ ...pooled, failedBuilds: 1, buildFailRate: 1 / 509 }, fips],
      byTarget: [
        { ...localTarget, failedBuilds: 1, buildFailRate: 1 / 509 },
        {
          ...localTarget,
          pipeline: 'kibana-fips',
          builds: 14,
          failedBuilds: 4,
          buildFailRate: 4 / 14,
        },
        {
          mode: 'serverless-observability_complete',
          type: 'cloud',
          pipeline: 'appex-qa-serverless-kibana-scout-tests',
          builds: 65,
          failedBuilds: 0,
          buildFailRate: 0,
        },
      ],
      flakiestBranch: {
        branch: 'main',
        pipeline: 'kibana-fips',
        builds: 14,
        failedBuilds: 4,
        buildFailRate: 4 / 14,
      },
    }),
  ]);
  const [suite] = groupIntoSuites(report.flaky, report.files);

  it('names the pipeline where it is flaky, and records only the branch for /skip', () => {
    const body = renderFlakySuiteIssueBody(suite, { report });

    expect(body).toContain('**`main` in `kibana-fips` 29% (4 / 14)**');
    expect(body).toContain('| `main` in `kibana-fips` | 🔴 Flaky | 4 / 14');
    expect(body).toContain('| `main` | 🟠 Some failures | 1 / 509');
    expect(readFlakySuiteIssueMetadata(body)?.['suite.branches']).toEqual(['main']);
  });

  it('gives the FIPS runs of a target their own row in the failures by target', () => {
    const body = renderFlakySuiteIssueBody(suite, { report });

    expect(body).toContain('| 🔴 `stateful-classic` | Local deployment (FIPS enabled) | 4 / 14');
    expect(body).toContain('| 🔴 `stateful-classic` | Local deployment | 1 / 509');
    // a Cloud target already says where it ran
    expect(body).toContain('| ✅ `serverless-observability_complete` | MKI | 0 / 65');
  });

  it('says where it is still flaky in its comments', () => {
    expect(renderFlakySuiteIssueComment(suite, { report, reopened: false })).toMatch(
      /^Still flaky on `main` in `kibana-fips`:\n\n- `creates default alert[^`]*`: 29% of builds \(4 \/ 14\)/
    );
  });
});
