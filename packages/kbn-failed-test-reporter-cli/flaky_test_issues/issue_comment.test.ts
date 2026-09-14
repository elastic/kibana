/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFlakySuiteCommentMetadata, renderFlakySuiteComment } from './issue_comment';
import { groupIntoSuites } from './suites';
import { flakyReport, flakyTest } from './test_fixtures';

const setup = () => {
  const report = flakyReport([
    flakyTest(),
    flakyTest({
      testId: 'second',
      title: 'second test',
      failedBuilds: 3,
      buildFailRate: 3 / 509,
      sampleFailures: [
        {
          message: 'Error: newer failure\nsecond line',
          buildUrl: 'https://buildkite.com/elastic/kibana-on-merge/builds/12400',
          timestamp: new Date('2026-09-09T08:00:00.000Z'),
        },
      ],
    }),
  ]);
  const [suite] = groupIntoSuites(report.flaky, report.files);
  return { report, suite };
};

describe('renderFlakySuiteComment', () => {
  it('renders a still-flaky comment on a suite issue with the previous numbers', () => {
    const { report, suite } = setup();
    expect(
      renderFlakySuiteComment(suite, {
        report,
        match: 'suite',
        kind: 'still-flaky',
        previous: { generatedAt: '2026-09-06T09:00:00.000Z', builds: 490, failedBuilds: 84 },
        otherIssues: [
          { number: 123, match: 'test' },
          { number: 124, match: 'moved' },
        ],
      })
    ).toMatchSnapshot();
  });

  it('renders a comment on a per-test issue, naming the suite file', () => {
    const { report, suite } = setup();
    const comment = renderFlakySuiteComment(suite, { report, match: 'test', kind: 'still-flaky' });

    expect(comment).toContain(
      "This test is in today's flaky test report for its suite `default_status_alert.spec.ts`: " +
        '**49 / 509 builds (10%)** on `kibana-on-merge` in the last 7 days (2–9 Sep 2026), ' +
        'in the top 5 flakiest tests.'
    );
    expect(comment).not.toContain('Previous report');
    expect(comment).not.toContain('Also tracked by');

    expect(
      renderFlakySuiteComment(suite, { report, match: 'moved', kind: 'still-flaky' })
    ).toContain(`for its suite, now at \`${suite.filePath}\`:`);
  });

  it('renders a reopen comment with the failures since the closing', () => {
    const { report, suite } = setup();
    const comment = renderFlakySuiteComment(suite, {
      report,
      match: 'suite',
      kind: 'reopened',
      closedAt: new Date('2026-09-05T12:00:00.000Z'),
      failedBuildsSinceClosed: 4,
    });

    expect(comment).toContain(
      'Reopened: still flaky after 4 failed builds since it was closed on 5 Sep. **49 / 509 builds'
    );

    expect(
      renderFlakySuiteComment(suite, { report, match: 'test', kind: 'reopened' })
    ).toContain('Reopened: still flaky after failing again. **49 / 509 builds');
  });

  it('records the snapshot of the worst test in the metadata', () => {
    const { report, suite } = setup();
    const comment = renderFlakySuiteComment(suite, { report, match: 'suite', kind: 'still-flaky' });

    expect(readFlakySuiteCommentMetadata(comment)).toEqual({
      generatedAt: '2026-09-09T09:04:41.000Z',
      builds: 509,
      failedBuilds: 49,
    });
    expect(readFlakySuiteCommentMetadata('New failure: build 1')).toBeUndefined();
    // metadata of a suite issue body is not a comment snapshot
    expect(
      readFlakySuiteCommentMetadata(
        '<!-- kibanaCiData = {"flaky-test-suite":{"suite.filePath":"a.ts","report.generatedAt":"x"}} -->'
      )
    ).toBeUndefined();
  });
});
