/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { testHistoryUrl } from '../failed_tests_reporter/test_history_dashboard';
import {
  andList,
  branchesByFailedBuilds,
  dashboardButton,
  dayStrip,
  flakyDays,
  formatBuildLink,
  formatDateRange,
  formatFailedBranches,
  formatFailedBuilds,
  formatFullFailureMessage,
  targetEnvironment,
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
    expect(range('2026-09-07T06:00:00Z', '2026-09-07T18:00:00Z')).toBe('7 Sep 2026');
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
  const thresholds = { minBuilds: 10, minFailedBuilds: 2, minFailRate: 0.03 };
  const test = flakyTest({
    byBranch: [
      { branch: 'main', builds: 547, failedBuilds: 0, buildFailRate: 0 },
      { branch: '9.5', builds: 122, failedBuilds: 4, buildFailRate: 4 / 122 },
      { branch: '9.4', builds: 100, failedBuilds: 2, buildFailRate: 0.02 },
      // a high rate on too few builds or failures does not qualify a branch
      { branch: 'feature', builds: 1, failedBuilds: 1, buildFailRate: 1 },
      { branch: '8.19', builds: 50, failedBuilds: 1, buildFailRate: 0.02 },
    ],
  });

  it('lists only the branches clearing every threshold, highest rate first, in bold', () => {
    expect(formatBranchRates(test, thresholds)).toBe('**`9.5` 3%&nbsp;(4&nbsp;/&nbsp;122)**');
    expect(formatBranchRates(test, { ...thresholds, minFailRate: 0.02 })).toBe(
      '**`9.5` 3%&nbsp;(4&nbsp;/&nbsp;122)**<br>**`9.4` 2%&nbsp;(2&nbsp;/&nbsp;100)**'
    );
  });

  it('shows a dash when no branch qualifies', () => {
    expect(formatBranchRates(flakyTest({ byBranch: [] }), thresholds)).toBe('-');
    expect(formatBranchRates(test, { ...thresholds, minFailRate: 0.5 })).toBe('-');
  });
});

describe('andList', () => {
  it('joins the last two items with "and"', () => {
    expect(andList([])).toBe('');
    expect(andList(['a'])).toBe('a');
    expect(andList(['a', 'b'])).toBe('a and b');
    expect(andList(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('dashboardButton', () => {
  it("links a Kibana logo button to the test's history dashboard", () => {
    expect(dashboardButton('t0')).toBe(
      `[![Dashboard](https://img.shields.io/badge/-%20-005571?logo=kibana&logoColor=white)](${testHistoryUrl(
        't0'
      )})`
    );
  });
});

describe('flakyDays', () => {
  const thresholds = { minBuilds: 10, minFailedBuilds: 2, minFailRate: 0.03 };
  const branch = (name: string, failedBuilds: number, failed?: number[], ran?: number[]) => ({
    branch: name,
    builds: 100,
    failedBuilds,
    buildFailRate: failedBuilds / 100,
    ...(failed ? { failedDaysAgo: failed } : {}),
    ...(ran ? { ranDaysAgo: ran } : {}),
  });

  it('merges the days of the branches the test is flaky on, leaving the others out', () => {
    const test = flakyTest({
      byBranch: [
        branch('main', 10, [0, 2], [0, 1, 2]),
        branch('9.6', 5, [5], [4, 5]),
        // a stray failure on a branch it is not flaky on
        branch('9.5', 1, [6], [6]),
      ],
    });
    expect(flakyDays(test, thresholds, 7)).toEqual({
      failed: new Set([0, 2, 5]),
      ran: new Set([0, 1, 2, 4, 5]),
    });
  });

  it('counts a run at the very start of the window as its first day', () => {
    const test = flakyTest({ byBranch: [branch('main', 10, [7], [7])] });
    expect(flakyDays(test, thresholds, 7)).toEqual({ failed: new Set([6]), ran: new Set([6]) });
  });

  it('knows no days for reports written before they were recorded', () => {
    expect(flakyDays(flakyTest({ byBranch: [branch('main', 10)] }), thresholds, 7)).toBe(undefined);
  });
});

describe('dayStrip', () => {
  it('shows one square per day, oldest first, joined so that it never wraps', () => {
    const strip = dayStrip({ failed: new Set([0, 4]), ran: new Set([0, 1, 2, 3, 4]) }, 7);
    expect(strip.split('\u2060')).toEqual(['⬜', '⬜', '🟥', '🟩', '🟩', '🟩', '🟥']);
  });
});

describe('testsTable', () => {
  const thresholds = { minBuilds: 10, minFailedBuilds: 2, minFailRate: 0.03 };

  it('caps the rows and says how many tests are left', () => {
    const tests = Array.from({ length: 4 }, (_, index) =>
      flakyTest({ testId: `t${index}`, title: `test | ${index}` })
    );
    const rendered = testsTable(tests, {
      withDashboardLinks: true,
      maxRows: 2,
      thresholds,
      lookbackDays: 7,
    });

    expect(rendered.split('\n')).toHaveLength(6);
    expect(rendered).toContain('|  | Test | Flaky branches | Past&nbsp;7&nbsp;days |');
    expect(rendered).toContain(
      `| ${dashboardButton('t0')} | test \\| 0 | **\`main\` 10%&nbsp;(49&nbsp;/&nbsp;509)** | ` +
        `${['🟥', '🟩', '🟥', '🟥', '🟩', '🟥', '🟥'].join('\u2060')} |`
    );
    expect(rendered).toContain('and 2 more flaky tests in this file.');
  });

  it('leaves out the buttons when told to, and the days when the report has none', () => {
    const rendered = testsTable([flakyTest()], {
      withDashboardLinks: false,
      maxRows: 10,
      thresholds,
    });
    expect(rendered).toContain('| Test | Flaky branches |');
    expect(rendered).not.toContain('Dashboard');
    expect(rendered).not.toContain('Past');
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

describe('targetEnvironment', () => {
  it('names where the target ran from its location and architecture', () => {
    expect(targetEnvironment({ mode: 'stateful-classic', type: 'local' })).toBe('Local deployment');
    expect(targetEnvironment({ mode: 'serverless-search', type: 'local' })).toBe(
      'Local serverless simulation'
    );
    expect(targetEnvironment({ mode: 'stateful-classic', type: 'cloud' })).toBe('ECH');
    expect(targetEnvironment({ mode: 'serverless-security_complete', type: 'cloud' })).toBe('MKI');
    // falls back to the location when either part is unknown
    expect(targetEnvironment({ mode: 'stateful-classic', type: 'unknown' })).toBe('unknown');
    expect(targetEnvironment({ mode: 'unknown', type: 'local' })).toBe('local');
  });
});

describe('formatFullFailureMessage', () => {
  it('keeps a long message whole, within the body limits', () => {
    const long = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
    expect(formatFullFailureMessage(long)).toBe(long);
    const tooLong = Array.from({ length: 400 }, (_, i) => `line ${i}`).join('\n');
    expect(formatFullFailureMessage(tooLong).split('\n')).toHaveLength(301);
    expect(formatFullFailureMessage(tooLong).endsWith('\n…')).toBe(true);
  });
});

describe('formatFailedBuilds', () => {
  it('puts the rate first, in bold, and keeps the counts on its line', () => {
    expect(formatFailedBuilds({ builds: 505, failedBuilds: 98, buildFailRate: 98 / 505 })).toBe(
      '**19%**&nbsp;(98&nbsp;/&nbsp;505)'
    );
    expect(formatFailedBuilds({ builds: 400, failedBuilds: 1, buildFailRate: 1 / 400 })).toBe(
      '**<1%**&nbsp;(1&nbsp;/&nbsp;400)'
    );
  });
});

describe('formatFailedBranches', () => {
  it('names release branches with main first and collapses pull request heads', () => {
    expect(
      formatFailedBranches({ failedBranches: 3, failedBranchNames: ['9.5', 'main', '8.19'] })
    ).toBe('`main`, `8.19`, `9.5`');
    expect(formatFailedBranches({ failedBranches: 2, failedBranchNames: ['a:one', 'b:two'] })).toBe(
      '2 PRs'
    );
    expect(formatFailedBranches({ failedBranches: 2, failedBranchNames: ['a:one', 'main'] })).toBe(
      '`main`, 1 PR'
    );
  });

  it('treats merge refs of pull requests as pull requests too', () => {
    expect(
      formatFailedBranches({ failedBranches: 2, failedBranchNames: ['pull/286809/head', 'main'] })
    ).toBe('`main`, 1 PR');
  });

  it('names at most four branches', () => {
    expect(
      formatFailedBranches({
        failedBranches: 6,
        failedBranchNames: ['9.5', '9.4', '9.3', 'main', '8.19', '8.18'],
      })
    ).toBe('`main`, `8.18`, `8.19`, `9.3`, +2 more');
  });

  it('falls back to the count without names', () => {
    expect(formatFailedBranches({ failedBranches: 7 })).toBe('7');
    expect(formatFailedBranches({ failedBranches: 1, failedBranchNames: [] })).toBe('1');
    expect(formatFailedBranches({ failedBranches: 0, failedBranchNames: [] })).toBe('-');
  });
});

describe('formatBuildLink', () => {
  const buildUrl = 'https://buildkite.com/elastic/kibana-on-merge/builds/12345';

  it('links the build number and appends the time', () => {
    expect(formatBuildLink({ buildUrl }, new Date('2026-09-09T06:12:00Z'))).toBe(
      `[#12345](${buildUrl}) · 2026-09-09 06:12 UTC`
    );
    expect(formatBuildLink({}, new Date('2026-09-09T06:12:00Z'))).toBe('2026-09-09 06:12 UTC');
    expect(formatBuildLink({ buildUrl: 'https://example.com/no-number' }, undefined)).toBe(
      '[build](https://example.com/no-number)'
    );
    expect(formatBuildLink({}, undefined)).toBe('-');
  });

  it('points the link at the job and names its step when known', () => {
    expect(
      formatBuildLink(
        { buildUrl, jobId: '0199-abcd', stepLabel: 'FTR Configs #3' },
        new Date('2026-09-09T06:12:00Z')
      )
    ).toBe(`[#12345](${buildUrl}#0199-abcd) · FTR Configs #3 · 2026-09-09 06:12 UTC`);
    // a URL that already points at a job is left alone
    expect(formatBuildLink({ buildUrl: `${buildUrl}#0199`, jobId: 'other' }, undefined)).toBe(
      `[#12345](${buildUrl}#0199)`
    );
  });
});
