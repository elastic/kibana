/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildRun } from '@kbn/scout-reporting';
import { readFlakySuiteIssueMetadata } from '../flaky_test_issues/issue_body';
import { describeIssue, findMatchingIssues } from '../flaky_test_issues/match_issues';
import {
  failingSuiteIssueTitle,
  renderFailingSuiteIssueBody,
  type FailingSuite,
  type FailingSuiteIssueContext,
} from './failing_suite_issue';
import { getIssueMetadata } from './issue_metadata';

const build = (number: number, overrides: Partial<BuildRun> = {}): BuildRun => ({
  build: number,
  buildUrl: `https://buildkite.com/elastic/kibana-on-merge/builds/${number}`,
  commit: String(number).repeat(10),
  lastAt: new Date('2026-10-16T10:00:00.000Z'),
  passed: 0,
  failed: 2,
  recovered: 0,
  skipped: 0,
  settled: true,
  ...overrides,
});

const suite: FailingSuite = {
  filePath: 'x-pack/platform/plugins/shared/discover/test/scout/ui/tests/esql.spec.ts',
  framework: 'playwright',
  suiteTitle: 'Discover ES|QL mode',
  configPath: 'x-pack/platform/plugins/shared/discover/test/scout/ui/playwright.config.ts',
  configCategory: 'ui-test',
  targets: [{ mode: 'stateful-classic', type: 'local' }],
  owners: ['@elastic/kibana-data-discovery'],
  tests: [
    {
      testId: 'test-1',
      title: 'Discover ES|QL mode shows results',
      errorMessage: 'Error: expect(locator).toBeVisible() failed\n\nLocator: getByTestId("rows")',
    },
    { testId: 'test-2', title: 'Discover ES|QL mode switches back to the data view' },
  ],
  failingBuilds: [build(101), build(102)],
  lastPassingBuild: build(100, { passed: 1, failed: 0 }),
};

const ctx: FailingSuiteIssueContext = { pipeline: 'kibana-on-merge', branch: 'main' };

describe('failingSuiteIssueTitle', () => {
  it('names the framework, what the config runs and the suite', () => {
    expect(failingSuiteIssueTitle(suite)).toBe('Failing Scout UI suite: Discover ES|QL mode');
    expect(failingSuiteIssueTitle({ ...suite, framework: 'ftr', configCategory: 'api-test' })).toBe(
      'Failing FTR API suite: Discover ES|QL mode'
    );
  });

  it('falls back to the file name without a suite title', () => {
    expect(failingSuiteIssueTitle({ ...suite, framework: 'jest', suiteTitle: undefined })).toBe(
      'Failing Jest suite: esql.spec.ts'
    );
  });
});

describe('renderFailingSuiteIssueBody', () => {
  it('says what broke, where, since when and what changed', () => {
    const body = renderFailingSuiteIssueBody(suite, ctx);

    expect(body).toContain(
      '> [!IMPORTANT]\n' +
        '> 2 tests in [`esql.spec.ts`](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/discover/test/scout/ui/tests/esql.spec.ts) ' +
        'failed every attempt of `kibana-on-merge` builds [#101](https://buildkite.com/elastic/kibana-on-merge/builds/101) ' +
        'and [#102](https://buildkite.com/elastic/kibana-on-merge/builds/102) on `main`, ' +
        'after passing in [#100](https://buildkite.com/elastic/kibana-on-merge/builds/100). ' +
        'This looks like a break rather than a flaky test; the changes between the last passing and the first failing build are ' +
        '[`1001001...1011011`](https://github.com/elastic/kibana/compare/100100100100100100100100100100...101101101101101101101101101101).'
    );
    expect(body).toContain(
      'Tests that failed every attempt:\n' +
        '- `Discover ES|QL mode shows results` · [history](https://appex-qa.kb.europe-west1.gcp.cloud.es.io/s/scout/app/dashboards'
    );
    expect(body).toContain('- `Discover ES|QL mode switches back to the data view` · [history](');
    expect(body).toContain('| **Framework** | Scout (Playwright) |');
    expect(body).toContain('| **Category** | UI test |');
    expect(body).toContain(
      '| **Config** | [`x-pack/platform/plugins/shared/discover/test/scout/ui/playwright.config.ts`](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/discover/test/scout/ui/playwright.config.ts) |'
    );
    expect(body).toContain('| **Target** | `stateful-classic` · Local deployment |');
    expect(body).toContain('| **Owners** | `@elastic/kibana-data-discovery` |');
    expect(body).toContain(
      'Last failure of `Discover ES|QL mode shows results`:\n\n' +
        '```text\nError: expect(locator).toBeVisible() failed\n\nLocator: getByTestId("rows")\n```'
    );
    expect(body).toContain('> [!TIP]');
  });

  it('counts the builds of a longer streak and says when no pass is on record', () => {
    const body = renderFailingSuiteIssueBody(
      {
        ...suite,
        tests: suite.tests.slice(0, 1),
        failingBuilds: [build(101), build(102), build(103), build(104)],
        lastPassingBuild: undefined,
      },
      ctx
    );

    expect(body).toContain(
      '> 1 test in [`esql.spec.ts`](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/discover/test/scout/ui/tests/esql.spec.ts) ' +
        'failed every attempt of the last 4 `kibana-on-merge` builds on `main`, ' +
        '[#101](https://buildkite.com/elastic/kibana-on-merge/builds/101) to [#104](https://buildkite.com/elastic/kibana-on-merge/builds/104), ' +
        'with no earlier passing run on `main` on record. This looks like a break rather than a flaky test.'
    );
    expect(body).not.toContain('compare');
    expect(body).toContain('Last failure:\n\n```text\n');
  });

  it('leaves out what it does not know and links related issues', () => {
    const body = renderFailingSuiteIssueBody(
      {
        ...suite,
        framework: 'ftr',
        suiteTitle: undefined,
        configPath: undefined,
        configCategory: undefined,
        targets: [],
        owners: [],
        tests: [{ testId: 'test-1', title: 'discover app shows results' }],
      },
      { ...ctx, relatedIssues: [123, 456] }
    );

    expect(body).toContain('| **Framework** | FTR |');
    expect(body).not.toContain('**Category**');
    expect(body).not.toContain('**Config**');
    expect(body).not.toContain('**Target**');
    expect(body).toContain('| **Owners** | - |');
    expect(body).not.toContain('Last failure');
    expect(body).toContain('Possibly related: #123, #456.');
  });

  it('records the suite metadata the flaky suite issues carry, so the issue tracks the tests', () => {
    const body = renderFailingSuiteIssueBody(suite, ctx);

    expect(readFlakySuiteIssueMetadata(body)).toEqual({
      'suite.filePath': suite.filePath,
      'suite.title': 'Discover ES|QL mode',
      'suite.framework': 'playwright',
      'suite.testIds': ['test-1', 'test-2'],
      'suite.branches': ['main'],
      'suite.pipelines': ['kibana-on-merge'],
      'report.generatedAt': undefined,
      'report.count': undefined,
      'report.history': [],
      'report.commentedAt': undefined,
    });
    expect(getIssueMetadata(body, 'test.failCount')).toBeUndefined();
  });

  it('is matched as about the suite by the issue matcher, and as its file by other blocks', () => {
    const issue = describeIssue({
      number: 7,
      html_url: 'https://github.com/elastic/kibana/issues/7',
      node_id: 'n7',
      title: failingSuiteIssueTitle(suite),
      labels: [],
      body: renderFailingSuiteIssueBody(suite, ctx),
      state: 'open',
    });

    expect(findMatchingIssues(suite, [issue])).toEqual([{ issue: issue.issue, match: 'suite' }]);
    expect(
      findMatchingIssues({ ...suite, suiteTitle: 'Another block of the file' }, [issue])
    ).toEqual([{ issue: issue.issue, match: 'file' }]);
  });
});
