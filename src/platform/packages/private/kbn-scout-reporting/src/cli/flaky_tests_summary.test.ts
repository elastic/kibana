/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripAnsi from 'strip-ansi';
import { ToolingLog } from '@kbn/tooling-log';
import type {
  FlakyTestBranchStats,
  FlakyTestEntry,
  FlakyTestReport,
} from '../reporting/flaky_tests';
import {
  buildTopFailingTable,
  classifiedEntries,
  displaySummary,
  flakiestBranch,
  formatAge,
  groupByFile,
  wrapOn,
  type ClassifiedEntry,
} from './flaky_tests_summary';

const now = new Date('2026-09-07T12:00:00.000Z');

// CI runs with colours enabled, which wraps borders and highlighted cells in ANSI codes
const render = (table: { toString(): string }): string => stripAnsi(table.toString());

const branch = (
  overrides: Partial<FlakyTestBranchStats> & { branch: string }
): FlakyTestBranchStats => ({
  builds: 10,
  failedBuilds: 1,
  buildFailRate: 0.1,
  ...overrides,
});

const entry = (overrides: Partial<FlakyTestEntry> = {}): FlakyTestEntry => ({
  testId: 'jest:a.test.ts:a test',
  framework: 'jest',
  title: 'a test',
  filePath: 'src/a.test.ts',
  owners: ['elastic/appex-qa'],
  areas: [],
  runs: 10,
  fails: 2,
  passes: 8,
  retryFlakes: 0,
  builds: 10,
  failedBuilds: 2,
  buildFailRate: 0.2,
  failedBranches: 1,
  byBranch: [
    branch({
      branch: 'main',
      failedBuilds: 2,
      buildFailRate: 0.2,
      latestRun: { status: 'passed', timestamp: new Date('2026-09-07T09:00:00.000Z') },
    }),
  ],
  firstFailedAt: new Date('2026-09-01T00:00:00.000Z'),
  lastFailedAt: new Date('2026-09-02T00:00:00.000Z'),
  latestRun: { status: 'passed', timestamp: new Date('2026-09-07T09:00:00.000Z'), branch: 'main' },
  sampleFailures: [],
  ...overrides,
});

describe('wrapOn', () => {
  it('leaves short text on one line', () => {
    expect(wrapOn('a/b/c', '/', 20)).toBe('a/b/c');
  });

  it('breaks on the separator and keeps it at the end of the line', () => {
    expect(wrapOn('x-pack/plugins/foo/bar.ts', '/', 14)).toBe('x-pack/\nplugins/foo/\nbar.ts');
  });

  it('counts the trailing separator towards the width so it never spills onto its own line', () => {
    // "x-pack/plugins" is exactly 14 wide; with its separator it is 15 and must break earlier
    expect(wrapOn('x-pack/plugins/foo', '/', 14)).toBe('x-pack/\nplugins/foo');
    expect(wrapOn('abcdefg/hij', '/', 8)).toBe('abcdefg/\nhij');
  });

  it('hard-splits a single segment longer than the width instead of truncating', () => {
    expect(wrapOn('abcdefghij', '/', 4)).toBe('abcd\nefgh\nij');
  });
});

describe('formatAge', () => {
  it.each([
    ['2026-09-07T11:55:00.000Z', '5m ago'],
    ['2026-09-07T09:00:00.000Z', '3h ago'],
    ['2026-09-05T12:00:00.000Z', '2d ago'],
  ])('formats %s as %s', (timestamp, expected) => {
    expect(formatAge(new Date(timestamp), now)).toBe(expected);
  });

  it('never reports a negative age', () => {
    expect(formatAge(new Date('2026-09-07T12:05:00.000Z'), now)).toBe('0m ago');
  });
});

describe('flakiestBranch', () => {
  it('returns undefined when there are no branches', () => {
    expect(flakiestBranch([], 10)).toBeUndefined();
  });

  it('prefers the highest fail rate among branches with enough builds', () => {
    const picked = flakiestBranch(
      [
        branch({ branch: 'main', builds: 50, buildFailRate: 0.1 }),
        branch({ branch: '9.2', builds: 20, buildFailRate: 0.3 }),
        branch({ branch: 'feature', builds: 1, buildFailRate: 1 }),
      ],
      10
    );
    expect(picked?.branch).toBe('9.2');
  });

  it('falls back to all branches when none has enough builds', () => {
    const picked = flakiestBranch(
      [
        branch({ branch: 'main', builds: 3, buildFailRate: 0.33 }),
        branch({ branch: '9.2', builds: 2, buildFailRate: 0.5 }),
      ],
      10
    );
    expect(picked?.branch).toBe('9.2');
  });
});

const flaky = (overrides: Partial<FlakyTestEntry> = {}): ClassifiedEntry => ({
  entry: entry(overrides),
  classification: 'flaky',
});

const broken = (overrides: Partial<FlakyTestEntry> = {}): ClassifiedEntry => ({
  entry: entry({ passes: 0, fails: 10, failedBuilds: 10, buildFailRate: 1, ...overrides }),
  classification: 'consistently-failing',
});

describe('groupByFile', () => {
  it('keeps files in order of first appearance and tests in input order', () => {
    const a1 = flaky({ testId: 'a1', filePath: 'a.ts' });
    const b1 = flaky({ testId: 'b1', filePath: 'b.ts' });
    const a2 = flaky({ testId: 'a2', filePath: 'a.ts' });

    const groups = groupByFile([a1, b1, a2]);

    expect([...groups.keys()]).toEqual(['a.ts', 'b.ts']);
    expect(groups.get('a.ts')).toEqual([a1, a2]);
  });
});

describe('classifiedEntries', () => {
  it('ranks flaky and consistently failing tests together by failed builds', () => {
    const ranked = classifiedEntries({
      flaky: [entry({ testId: 'f1', failedBuilds: 5 }), entry({ testId: 'f2', failedBuilds: 20 })],
      consistentlyFailing: [entry({ testId: 'c1', failedBuilds: 10 })],
    });

    expect(ranked.map(({ entry: { testId }, classification }) => [testId, classification])).toEqual(
      [
        ['f2', 'flaky'],
        ['c1', 'consistently-failing'],
        ['f1', 'flaky'],
      ]
    );
  });
});

describe('buildTopFailingTable', () => {
  it('renders one row per test with a shared file cell and the flakiest branch', () => {
    const first = flaky({ testId: 't1', title: 'first test' });
    const second = flaky({ testId: 't2', title: 'second test' });
    const rendered = render(buildTopFailingTable([first, second], [first, second], 10, now));

    expect(rendered).toContain('first test');
    expect(rendered).toContain('second test');
    expect(rendered).toContain('2/10');
    expect(rendered).toContain('main (20.0%)');
    expect(rendered).toContain('passed');
    expect(rendered).toContain('3h ago');
    expect(rendered).toContain('elastic/appex-qa');
    // the file path appears once for the two rows it spans
    expect(rendered.match(/src\/a\.test\.ts/g)).toHaveLength(1);
  });

  it('mentions qualifying tests of the same file that did not make the top list', () => {
    const shown = flaky({ testId: 't1' });
    const hidden = [flaky({ testId: 't2' }), broken({ testId: 't3' })];
    const rendered = render(buildTopFailingTable([shown], [shown, ...hidden], 10, now));

    expect(rendered).toContain('(+2 more in this file)');
  });

  it('renders consistently failing tests alongside flaky ones', () => {
    const rendered = render(
      buildTopFailingTable(
        [
          broken({ testId: 'c1', title: 'always broken' }),
          flaky({ testId: 'f1', title: 'sometimes' }),
        ],
        [],
        10,
        now
      )
    );

    expect(rendered).toContain('always broken');
    expect(rendered).toContain('10/10');
    expect(rendered).toContain('sometimes');
    expect(rendered).toContain('2/10');
  });

  it('uses the latest run of the flakiest branch rather than the overall latest run', () => {
    const rendered = render(
      buildTopFailingTable(
        [
          flaky({
            byBranch: [
              branch({
                branch: 'main',
                buildFailRate: 0.1,
                latestRun: { status: 'passed', timestamp: new Date('2026-09-07T11:00:00.000Z') },
              }),
              branch({
                branch: '9.2',
                buildFailRate: 0.5,
                latestRun: { status: 'failed', timestamp: new Date('2026-09-06T12:00:00.000Z') },
              }),
            ],
            latestRun: {
              status: 'passed',
              timestamp: new Date('2026-09-07T11:00:00.000Z'),
              branch: 'main',
            },
          }),
        ],
        [],
        10,
        now
      )
    );

    expect(rendered).toContain('9.2 (50.0%)');
    expect(rendered).toContain('failed');
    expect(rendered).toContain('1d ago');
  });

  it('shows placeholders when owners and branch stats are missing', () => {
    const rendered = render(
      buildTopFailingTable([flaky({ owners: [], byBranch: [], latestRun: undefined })], [], 10, now)
    );

    // owners, flakiest branch and latest run all fall back to a dash; adjacent cells share a
    // border, so match with a lookahead instead of consuming it
    expect(rendered.match(/│\s+-\s+(?=│)/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('displaySummary', () => {
  const report: FlakyTestReport = {
    schemaVersion: 1,
    generatedAt: now,
    window: {
      lookbackDays: 7,
      from: new Date('2026-08-31T12:00:00.000Z'),
      to: now,
    },
    scope: { pipelines: ['kibana-on-merge'], branches: [], frameworks: ['jest', 'playwright'] },
    thresholds: { minBuilds: 10, minFailedBuilds: 2, maxTests: 200 },
    summary: { totalFlaky: 2, totalConsistentlyFailing: 1, flakyByFramework: { jest: 2 } },
    flaky: [entry({ testId: 't1', title: 'first' }), entry({ testId: 't2', title: 'second' })],
    consistentlyFailing: [],
  };
  const alwaysBroken = entry({
    testId: 'c1',
    title: 'always broken',
    passes: 0,
    fails: 10,
    failedBuilds: 10,
    buildFailRate: 1,
  });

  const renderSummary = (input: FlakyTestReport, limit: number): string => {
    const writes: string[] = [];
    const log = new ToolingLog();
    log.write = jest.fn((...args: unknown[]) => {
      writes.push(String(args[0]));
    }) as unknown as ToolingLog['write'];
    displaySummary(input, limit, log);
    return stripAnsi(writes.join(''));
  };

  it('prints window, scope, totals and the capped top list', () => {
    const output = renderSummary(report, 1);

    expect(output).toContain('Flaky tests summary');
    expect(output).toContain('Lookback : 7d');
    expect(output).toContain('Pipelines  : kibana-on-merge');
    expect(output).toContain('Branches   : any');
    expect(output).toContain('Frameworks : jest, playwright');
    expect(output).toContain('Min builds        : 10');
    expect(output).toContain('Min failed builds : 2');
    expect(output).toContain('Max tests         : 200 per list');
    expect(output).toContain('Consistently failing = qualifying test that never passed');
    expect(output).toContain('Flaky                : 2 (jest: 2)');
    expect(output).toContain('Consistently failing : 1');
    expect(output).toContain('Top 1 failing tests by failed builds');
    expect(output).toContain('first');
    expect(output).not.toContain('second');
  });

  it('includes consistently failing tests in the top list', () => {
    const output = renderSummary(
      {
        ...report,
        summary: { totalFlaky: 2, totalConsistentlyFailing: 1, flakyByFramework: { jest: 2 } },
        consistentlyFailing: [alwaysBroken],
      },
      1
    );

    // 10 failed builds outranks the flaky tests' 2
    expect(output).toContain('Top 1 failing tests by failed builds');
    expect(output).toContain('always broken');
    expect(output).not.toContain('first');
  });

  it('omits the top list when nothing qualifies', () => {
    const output = renderSummary(
      {
        ...report,
        summary: { totalFlaky: 0, totalConsistentlyFailing: 0, flakyByFramework: {} },
        flaky: [],
      },
      10
    );

    expect(output).toContain('Flaky                : 0');
    expect(output).not.toContain('failing tests by failed builds');
  });
});
