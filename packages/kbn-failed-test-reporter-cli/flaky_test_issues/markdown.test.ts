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
  formatFailedBranches,
  formatFailedBuilds,
  formatFullFailureMessage,
  targetEnvironment,
  formatFailureMessage,
  formatBranchRates,
  formatPercent,
  testDashboardUrl,
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
    expect(formatBranchRates(test, thresholds)).toBe('**`9.5` 3% (4 / 122)**');
    expect(formatBranchRates(test, { ...thresholds, minFailRate: 0.02 })).toBe(
      '**`9.5` 3% (4 / 122)**<br>**`9.4` 2% (2 / 100)**'
    );
  });

  it('shows a dash when no branch qualifies', () => {
    expect(formatBranchRates(flakyTest({ byBranch: [] }), thresholds)).toBe('-');
    expect(formatBranchRates(test, { ...thresholds, minFailRate: 0.5 })).toBe('-');
  });
});

describe('testDashboardUrl', () => {
  it('filters the Scout dashboard on the test id, as a rison string', () => {
    expect(testDashboardUrl('06fc533cda37130-a089b9a7d2f8995')).toBe(
      "https://appex-qa.kb.europe-west1.gcp.cloud.es.io/s/scout/app/dashboards#/view/a06c26f6-23ac-479d-acb5-5a8b234793a8?_g=(filters:!((meta:(alias:'Test%20ID',disabled:!f,negate:!f),query:(bool:(must:!((match_phrase:(test.id:'06fc533cda37130-a089b9a7d2f8995'))))))))"
    );
    // quotes and bangs are rison-escaped, spaces URL-encoded
    expect(testDashboardUrl("it's a test!")).toContain("test.id:'it!'s%20a%20test!!'");
  });
});

describe('testsTable', () => {
  it('caps the rows and says how many tests are left', () => {
    const tests = Array.from({ length: 4 }, (_, index) =>
      flakyTest({ testId: `t${index}`, title: `test | ${index}` })
    );
    const rendered = testsTable(tests, {
      withDashboardLinks: true,
      maxRows: 2,
      thresholds: { minBuilds: 10, minFailedBuilds: 2, minFailRate: 0.03 },
    });

    expect(rendered.split('\n')).toHaveLength(6);
    expect(rendered).toContain('| Test | Flaky branches | Dashboard |');
    expect(rendered).toContain(
      `| test \\| 0 | **\`main\` 10% (49 / 509)** | [dashboard](${testDashboardUrl('t0')}) |`
    );
    expect(rendered).toContain('and 2 more flaky tests in this file.');
    expect(
      testsTable(tests, {
        withDashboardLinks: false,
        maxRows: 10,
        thresholds: { minBuilds: 10, minFailedBuilds: 2, minFailRate: 0.03 },
      })
    ).not.toContain('Dashboard');
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
  it('bolds the rate', () => {
    expect(formatFailedBuilds({ builds: 505, failedBuilds: 98, buildFailRate: 98 / 505 })).toBe(
      '98 / 505 (**19%**)'
    );
    expect(formatFailedBuilds({ builds: 400, failedBuilds: 1, buildFailRate: 1 / 400 })).toBe(
      '1 / 400 (**<1%**)'
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
