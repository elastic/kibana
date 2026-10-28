/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeTestID } from '@kbn/scout-reporting';
import { ToolingLog } from '@kbn/tooling-log';
import {
  MAX_NEW_ISSUES_PER_JOB,
  reportConsistentFailureIssues,
  type ConsistentFailureIssuesOptions,
} from './consistent_failure_issues';
import { renderFailingSuiteIssueBody } from './failing_suite_issue';
import type { TestFailure } from './get_failures';
import type { ScoutTestFailureExtended } from './get_scout_failures';
import type { GithubApi, GithubIssue } from './github_api';

const log = new ToolingLog();
const build = { pipeline: 'kibana-on-merge', branch: 'main' };

const SPEC = 'x-pack/platform/plugins/shared/discover/test/scout/ui/tests/esql.spec.ts';
const FTR_FILE = 'x-pack/platform/test/functional/apps/discover/group1/_discover.ts';
const FTR_NAME = 'discover app discover test shows results';
const FTR_TEST_ID = computeTestID(FTR_FILE, FTR_NAME);

const scoutFailure = (
  id: string,
  name: string,
  overrides: Partial<ScoutTestFailureExtended> = {}
): ScoutTestFailureExtended => ({
  classname: 'Discover ES|QL mode',
  name,
  time: '1.5',
  failure: 'Error: boom\n    at esql.spec.ts:10',
  likelyIrrelevant: false,
  errorMessage: `Error: ${name} boom`,
  owners: '@elastic/kibana-data-discovery',
  id,
  target: 'local-stateful-classic',
  location: SPEC,
  duration: 1500,
  ...overrides,
});

const ftrFailure: TestFailure = {
  classname: `Chrome X-Pack UI Functional Tests.${FTR_FILE.replace(/\./g, '·')}`,
  name: FTR_NAME,
  time: '2',
  failure: 'Error: ftr boom\n    at _discover.ts:20',
  likelyIrrelevant: false,
  owners: '@elastic/kibana-data-discovery,@elastic/appex-qa',
  testType: 'ftr',
};

const cypressFailure: TestFailure = {
  classname:
    'Cypress Tests.x-pack/solutions/security/plugins/security_solution/cypress/e2e/foo·cy·ts',
  name: 'foo does bar',
  time: '1',
  failure: 'boom',
  likelyIrrelevant: false,
  testType: 'cypress',
};

/** One row of the recent runs query: a build's runs of a test in one setup. */
const row = (testId: string, buildNumber: number, overrides: Record<string, unknown> = {}) => ({
  test_id: testId,
  config_path: 'x-pack/platform/plugins/shared/discover/test/scout/ui/playwright.config.ts',
  target_mode: 'stateful-classic',
  target_type: 'local',
  build: buildNumber,
  passed: 1,
  failed: 0,
  recovered: 0,
  skipped: 0,
  attempts: null,
  last_at: '2026-10-16T10:00:00.000Z',
  build_url: `https://buildkite.com/elastic/kibana-on-merge/builds/${buildNumber}`,
  commit: `commit-${buildNumber}`,
  suite_title: 'Discover ES|QL mode',
  config_category: 'ui-test',
  ...overrides,
});

/** Twenty passes, then a test that failed every attempt of the latest builds. */
const brokenSince = (testId: string, from: number, to: number, overrides = {}) => [
  ...Array.from({ length: 20 }, (_, index) => row(testId, from - 20 + index, overrides)),
  ...Array.from({ length: to - from + 1 }, (_, index) =>
    row(testId, from + index, { passed: 0, failed: 2, attempts: 2, ...overrides })
  ),
];

/** Rows go out as they come in, the query itself is covered in @kbn/scout-reporting. */
const mockEs = (rows: Array<Record<string, unknown>>) => {
  const esql = jest.fn().mockImplementation(({ query }: { query: string }) => ({
    toRecords: async () => ({
      records: rows.filter((record) => query.includes(`"${record.test_id}"`)),
    }),
  }));
  return { es: { helpers: { esql } } as any, esql };
};

const issue = (
  number: number,
  body: string,
  overrides: Partial<GithubIssue> = {}
): GithubIssue => ({
  number,
  html_url: `https://github.com/elastic/appex-qa-ai/issues/${number}`,
  node_id: `node-${number}`,
  title: `Issue ${number}`,
  labels: [],
  body,
  state: 'open',
  ...overrides,
});

const mockGithub = (issues: GithubIssue[] = []) => {
  const listIssues = jest.fn().mockResolvedValue(issues);
  const createIssue = jest.fn().mockImplementation(async (title: string, body: string) => ({
    number: 500,
    html_url: 'https://github.com/elastic/appex-qa-ai/issues/500',
    node_id: 'node-500',
    body,
  }));
  return { github: { listIssues, createIssue } as unknown as GithubApi, listIssues, createIssue };
};

const report = (
  overrides: Partial<ConsistentFailureIssuesOptions> & Pick<ConsistentFailureIssuesOptions, 'es'>
) =>
  reportConsistentFailureIssues({
    log,
    failures: [],
    github: mockGithub().github,
    repo: 'elastic/appex-qa-ai',
    build,
    dryRun: false,
    ...overrides,
  });

describe('reportConsistentFailureIssues', () => {
  it('files one issue per file for the tests that failed every attempt of the latest builds', async () => {
    const { es } = mockEs([
      ...brokenSince('test-1', 101, 102),
      ...brokenSince('test-2', 101, 102),
      ...brokenSince(FTR_TEST_ID, 101, 102, {
        config_path: 'x-pack/platform/test/functional/apps/discover/group1/config.ts',
        target_mode: 'unknown',
        target_type: 'unknown',
        suite_title: 'discover app discover test',
        config_category: 'ui-test',
      }),
      // flaky: failed, then passed on the job's retry
      ...brokenSince('test-3', 101, 102).map((record) =>
        record.failed ? { ...record, passed: 1, failed: 1 } : record
      ),
    ]);
    const { github, createIssue, listIssues } = mockGithub();

    const summary = await report({
      es,
      github,
      failures: [
        scoutFailure('test-1', 'shows results'),
        scoutFailure('test-2', 'switches back'),
        scoutFailure('test-3', 'is flaky'),
        ftrFailure,
        cypressFailure,
      ],
    });

    expect(listIssues).toHaveBeenCalledWith({ state: 'open', labels: ['failed-test'] });
    expect(createIssue).toHaveBeenCalledTimes(2);
    const [[scoutTitle, scoutBody, scoutLabels], [ftrTitle, ftrBody, ftrLabels]] =
      createIssue.mock.calls;
    expect(scoutTitle).toBe('Failing Scout UI suite: Discover ES|QL mode');
    expect(scoutBody).toContain('> 2 tests in [`esql.spec.ts`]');
    expect(scoutBody).toContain(
      'builds [#101](https://buildkite.com/elastic/kibana-on-merge/builds/101) and [#102]'
    );
    expect(scoutBody).toContain('after passing in [#100]');
    expect(scoutBody).toContain('- `Discover ES|QL mode shows results`');
    expect(scoutBody).toContain('- `Discover ES|QL mode switches back`');
    expect(scoutBody).not.toContain('is flaky');
    expect(scoutBody).toContain('| **Target** | `stateful-classic` · Local deployment |');
    expect(scoutBody).toContain('| **Owners** | `@elastic/kibana-data-discovery` |');
    expect(scoutBody).toContain('```text\nError: shows results boom\n```');
    expect(scoutLabels).toEqual(['failed-test']);
    expect(ftrTitle).toBe('Failing FTR UI suite: discover app discover test');
    expect(ftrBody).toContain(
      `> 1 test in [\`_discover.ts\`](https://github.com/elastic/kibana/blob/main/${FTR_FILE})`
    );
    expect(ftrBody).not.toContain('**Target**');
    expect(ftrBody).toContain(
      '| **Owners** | `@elastic/kibana-data-discovery`, `@elastic/appex-qa` |'
    );
    expect(ftrBody).toContain('```text\nError: ftr boom\n```');
    expect(ftrLabels).toEqual(['failed-test']);
    expect(summary).toEqual({
      created: [
        { filePath: SPEC, url: 'https://github.com/elastic/appex-qa-ai/issues/500' },
        { filePath: FTR_FILE, url: 'https://github.com/elastic/appex-qa-ai/issues/500' },
      ],
      tracked: [],
      skipped: [],
    });
  });

  it('files nothing when no test fails consistently', async () => {
    const { es } = mockEs([
      // broke in this build only
      ...brokenSince('test-1', 102, 102),
      // failed every attempt a few builds ago too: not a clean history
      ...brokenSince('test-2', 101, 102).map((record) =>
        record.build === 95 ? { ...record, passed: 0, failed: 2, attempts: 2 } : record
      ),
    ]);
    const { github, createIssue, listIssues } = mockGithub();

    const summary = await report({
      es,
      github,
      failures: [
        scoutFailure('test-1', 'broke in this build'),
        scoutFailure('test-2', 'failed before'),
      ],
    });

    expect(listIssues).not.toHaveBeenCalled();
    expect(createIssue).not.toHaveBeenCalled();
    expect(summary).toEqual({ created: [], tracked: [], skipped: [] });
  });

  it('leaves a build whose retry has not reported the test out of the count', async () => {
    // the current build's job failed once, its retry has not run: #101 alone is one build short
    const current = brokenSince('test-1', 101, 102).map((record) =>
      record.build === 102 ? { ...record, failed: 1, attempts: 1 } : record
    );
    const short = await report({ es: mockEs(current).es, failures: [scoutFailure('test-1', 'x')] });
    expect(short.created).toHaveLength(0);

    // an earlier build with a single failing report neither counts nor breaks the streak
    const earlier = brokenSince('test-1', 100, 102).map((record) =>
      record.build === 101 ? { ...record, failed: 1, attempts: 1 } : record
    );
    const { github, createIssue } = mockGithub();
    const found = await report({
      es: mockEs(earlier).es,
      github,
      failures: [scoutFailure('test-1', 'x')],
    });
    expect(found.created).toHaveLength(1);
    expect(createIssue.mock.calls[0][1]).toContain(
      'builds [#100](https://buildkite.com/elastic/kibana-on-merge/builds/100) and [#102]'
    );
  });

  it('skips a suite an open issue is already about, and names it', async () => {
    const { es } = mockEs(brokenSince('test-1', 101, 102));
    const [failure] = [scoutFailure('test-1', 'shows results')];
    const run = (number: number) => ({
      build: number,
      lastAt: new Date('2026-10-15T10:00:00.000Z'),
      passed: 0,
      failed: 2,
      recovered: 0,
      skipped: 0,
      settled: true,
    });
    const existing = issue(
      42,
      renderFailingSuiteIssueBody(
        {
          filePath: SPEC,
          framework: 'playwright',
          suiteTitle: 'Discover ES|QL mode',
          targets: [],
          owners: [],
          tests: [{ testId: 'test-1', title: 'Discover ES|QL mode shows results' }],
          failingBuilds: [run(90), run(91)],
        },
        { pipeline: 'kibana-on-merge', branch: 'main' }
      )
    );
    const { github, createIssue } = mockGithub([existing]);

    const summary = await report({ es, github, failures: [failure] });

    expect(createIssue).not.toHaveBeenCalled();
    expect(summary.tracked).toEqual([{ filePath: SPEC, url: existing.html_url }]);
  });

  it('skips a suite whose every test has a per-test issue, but not one with a test without', async () => {
    const perTestIssue = (number: number, testId: string) =>
      issue(
        number,
        `A test failed on a tracked branch\n\n| Test ID | ${testId} |\n| Location | ${SPEC} |\n\n` +
          `<!-- kibanaCiData = ${JSON.stringify({
            'failed-test': {
              'test.class': 'Discover ES|QL mode',
              'test.name': 'x',
              'test.type': 'scout',
            },
          })} -->`
      );

    const covered = await report({
      es: mockEs([...brokenSince('test-1', 101, 102), ...brokenSince('test-2', 101, 102)]).es,
      github: mockGithub([perTestIssue(1, 'test-1'), perTestIssue(2, 'test-2')]).github,
      failures: [scoutFailure('test-1', 'a'), scoutFailure('test-2', 'b')],
    });
    expect(covered.tracked).toHaveLength(1);
    expect(covered.created).toHaveLength(0);

    const { github, createIssue } = mockGithub([perTestIssue(1, 'test-1')]);
    const partlyCovered = await report({
      es: mockEs([...brokenSince('test-1', 101, 102), ...brokenSince('test-2', 101, 102)]).es,
      github,
      failures: [scoutFailure('test-1', 'a'), scoutFailure('test-2', 'b')],
    });
    expect(partlyCovered.created).toHaveLength(1);
    expect(createIssue.mock.calls[0][1]).toContain('Possibly related: #1.');
  });

  it('caps the issues a job files, most broken tests first', async () => {
    const files = Array.from({ length: MAX_NEW_ISSUES_PER_JOB + 1 }, (_, index) => `${index}`);
    const rows = files.flatMap((file) => brokenSince(`test-${file}`, 101, 102));
    const failures = files.map((file) =>
      scoutFailure(`test-${file}`, 'x', {
        location: `x-pack/test/scout/ui/tests/file_${file}.spec.ts`,
      })
    );
    // the last file has two broken tests, so it goes first
    rows.push(...brokenSince('test-extra', 101, 102));
    failures.push(
      scoutFailure('test-extra', 'y', {
        location: `x-pack/test/scout/ui/tests/file_${files.at(-1)}.spec.ts`,
      })
    );
    const { github, createIssue } = mockGithub();

    const summary = await report({ es: mockEs(rows).es, github, failures });

    expect(createIssue).toHaveBeenCalledTimes(MAX_NEW_ISSUES_PER_JOB);
    expect(summary.created[0].filePath).toBe(
      `x-pack/test/scout/ui/tests/file_${files.at(-1)}.spec.ts`
    );
    expect(summary.skipped).toEqual([
      `x-pack/test/scout/ui/tests/file_${MAX_NEW_ISSUES_PER_JOB - 1}.spec.ts`,
    ]);
  });

  it('asks nothing when no failure has a test id', async () => {
    const { es, esql } = mockEs([]);

    const summary = await report({ es, failures: [cypressFailure] });

    expect(esql).not.toHaveBeenCalled();
    expect(summary).toEqual({ created: [], tracked: [], skipped: [] });
  });
});
