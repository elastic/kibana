/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  branchesByFailedBuilds,
  formatBuildLink,
  formatDateRange,
  formatFailureMessage,
  formatBranchRates,
  formatPercent,
  testsTable,
} from './markdown';
import { flakyTest } from './test_fixtures';

describe('formatPercent', () => {
  it('rounds to whole percents and never rounds a failure down to nothing', () => {
    expect(formatPercent(0.194)).toBe('19%');
    expect(formatPercent(0.004)).toBe('<1%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('formatDateRange', () => {
  it('shares the month and the year when it can', () => {
    const range = (from: string, to: string) => formatDateRange(new Date(from), new Date(to));
    expect(range('2026-09-03T10:00:00Z', '2026-09-10T10:00:00Z')).toBe('3–10 Sep 2026');
    expect(range('2026-08-28T10:00:00Z', '2026-09-04T10:00:00Z')).toBe('28 Aug – 4 Sep 2026');
    expect(range('2025-12-28T10:00:00Z', '2026-01-04T10:00:00Z')).toBe('28 Dec 2025 – 4 Jan 2026');
  });
});

describe('branchesByFailedBuilds', () => {
  it('orders branches by failed builds, adding them up over several tests', () => {
    const test = flakyTest({
      byBranch: [
        { branch: 'main', builds: 400, failedBuilds: 10, buildFailRate: 0.025 },
        { branch: '9.2', builds: 100, failedBuilds: 30, buildFailRate: 0.3 },
      ],
    });
    expect(
      branchesByFailedBuilds([test, test]).map(({ branch, failedBuilds }) => [branch, failedBuilds])
    ).toEqual([
      ['9.2', 60],
      ['main', 20],
    ]);
  });
});

describe('formatBranchRates', () => {
  const test = flakyTest({
    byBranch: [
      { branch: 'main', builds: 547, failedBuilds: 0, buildFailRate: 0 },
      { branch: '9.5', builds: 122, failedBuilds: 4, buildFailRate: 4 / 122 },
      { branch: '9.4', builds: 100, failedBuilds: 2, buildFailRate: 0.02 },
    ],
  });

  it('lists every branch by rate on its own line, in bold where the rate clears the threshold', () => {
    expect(formatBranchRates(test, 0.03)).toBe(
      '**`9.5` 3% (4 / 122)**<br>`9.4` 2% (2 / 100)<br>`main` 0% (0 / 547)'
    );
  });

  it('bolds nothing without a rate threshold, and shows a dash without branches', () => {
    expect(formatBranchRates(test, 0)).not.toContain('**');
    expect(formatBranchRates(flakyTest({ byBranch: [] }), 0.03)).toBe('-');
  });
});

describe('testsTable', () => {
  it('caps the rows and says how many tests are left', () => {
    const tests = Array.from({ length: 4 }, (_, index) =>
      flakyTest({ testId: `t${index}`, title: `test | ${index}` })
    );
    const rendered = testsTable(tests, { withTestId: true, maxRows: 2, minFailRate: 0.03 });

    expect(rendered.split('\n')).toHaveLength(6);
    expect(rendered).toContain('| Test | Flaky rate by branch | Test ID |');
    expect(rendered).toContain('| test \\| 0 | **`main` 10% (49 / 509)** | t0 |');
    expect(rendered).toContain('| t1 |');
    expect(rendered).toContain('and 2 more flaky tests in this file.');
    expect(testsTable(tests, { withTestId: false, maxRows: 10, minFailRate: 0.03 })).not.toContain(
      'Test ID'
    );
  });
});

describe('formatFailureMessage', () => {
  it('redacts, trims, neutralises fences and cuts long messages', () => {
    expect(formatFailureMessage('  Error at https://abc.found.no/x by me@elastic.co ```  ')).toBe(
      'Error at <redacted>.found.no by <redacted>@elastic.co ` ` `'
    );
    const long = Array.from({ length: 20 }, (_, index) => `line ${index}`).join('\n');
    const cut = formatFailureMessage(long);
    expect(cut.split('\n')).toHaveLength(13);
    expect(cut.endsWith('line 11\n…')).toBe(true);
  });
});

describe('formatBuildLink', () => {
  it('links the build number and appends the time', () => {
    expect(
      formatBuildLink(
        'https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199',
        new Date('2026-09-09T06:12:00Z')
      )
    ).toBe(
      '[#12345](https://buildkite.com/elastic/kibana-on-merge/builds/12345#0199) · 2026-09-09 06:12 UTC'
    );
    expect(formatBuildLink(undefined, new Date('2026-09-09T06:12:00Z'))).toBe(
      '2026-09-09 06:12 UTC'
    );
    expect(formatBuildLink('https://example.com/no-number', undefined)).toBe(
      '[build](https://example.com/no-number)'
    );
    expect(formatBuildLink(undefined, undefined)).toBe('-');
  });
});
