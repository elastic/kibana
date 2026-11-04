/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The module under test invokes `run()` at import time to bootstrap the CLI.
// Mock it out so importing the module for unit tests does not execute the CLI
// against Jest's own argv (which fails with "Unknown flag(s)").
jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

import childProcess from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import type { MoonRunReport, MoonTaskQuery, QuickCheck } from './run_quick_checks';
import {
  buildPipelineAnnotation,
  collectCheckResults,
  parseQuickChecks,
  selectQuickChecks,
} from './run_quick_checks';

describe('cancelGatedStepsOnFirstCommit', () => {
  const ORIGINAL_CHECK_GATE = process.env.CHECK_GATE;
  const markerFile = join(REPO_ROOT, '.collect_commits_marker');
  const cancelScript = join(REPO_ROOT, '.buildkite/scripts/steps/gate_failure/cancel.sh');
  const log = new ToolingLog();

  let spawnSpy: jest.SpyInstance;
  let existsSyncSpy: jest.SpyInstance;
  let cancelGatedStepsOnFirstCommit: (log: ToolingLog) => void;

  beforeEach(() => {
    process.env.CHECK_GATE = 'true';
    spawnSpy = jest
      .spyOn(childProcess, 'spawn')
      .mockReturnValue(new EventEmitter() as childProcess.ChildProcess);
    existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.isolateModules(() => {
      ({ cancelGatedStepsOnFirstCommit } = jest.requireActual('./run_quick_checks'));
    });
  });

  afterEach(() => {
    process.env.CHECK_GATE = ORIGINAL_CHECK_GATE;
    jest.restoreAllMocks();
  });

  it('does nothing until a commit is recorded', () => {
    cancelGatedStepsOnFirstCommit(log);

    expect(existsSyncSpy).toHaveBeenCalledWith(markerFile);
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('runs the cancel-on-gate-failure script once after the first commit', () => {
    existsSyncSpy.mockReturnValue(true);

    cancelGatedStepsOnFirstCommit(log);
    cancelGatedStepsOnFirstCommit(log);

    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(spawnSpy).toHaveBeenCalledWith('bash', [cancelScript], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
  });

  it('does nothing outside of check gate steps', () => {
    delete process.env.CHECK_GATE;
    existsSyncSpy.mockReturnValue(true);

    cancelGatedStepsOnFirstCommit(log);

    expect(spawnSpy).not.toHaveBeenCalled();
  });
});

const i18nCheck: QuickCheck = {
  id: 'i18n',
  script: '.buildkite/scripts/steps/checks/i18n.sh',
  exclusive: false,
};
const licensesCheck: QuickCheck = {
  id: 'licenses',
  script: '.buildkite/scripts/steps/checks/licenses.sh',
  exclusive: false,
};
const telemetryCheck: QuickCheck = {
  id: 'telemetry',
  script: '.buildkite/scripts/steps/checks/telemetry.sh',
  exclusive: true,
};
const allChecks = [i18nCheck, licensesCheck, telemetryCheck];

describe('parseQuickChecks', () => {
  it('lists the quick-checks Moon project tasks with their scripts and mutex', () => {
    const query: MoonTaskQuery = {
      tasks: {
        'quick-checks': {
          i18n: { args: [i18nCheck.script], options: { mutex: null } },
          telemetry: { args: [telemetryCheck.script], options: { mutex: 'workspace' } },
        },
      },
    };

    expect(parseQuickChecks(query)).toEqual([i18nCheck, telemetryCheck]);
  });

  it('returns no checks when the project is missing', () => {
    expect(parseQuickChecks({ tasks: {} })).toEqual([]);
  });
});

describe('selectQuickChecks', () => {
  it('selects every check without a selection', () => {
    expect(selectQuickChecks(allChecks)).toEqual(allChecks);
    expect(selectQuickChecks(allChecks, ' ')).toEqual(allChecks);
  });

  it('selects checks by task ID or script path', () => {
    expect(
      selectQuickChecks(
        allChecks,
        `telemetry,\n${REPO_ROOT}/.buildkite/scripts/steps/checks/i18n.sh, ./${licensesCheck.script}`
      )
    ).toEqual([telemetryCheck, i18nCheck, licensesCheck]);
  });

  it('selects a check once when it is named twice', () => {
    expect(selectQuickChecks(allChecks, `i18n,${i18nCheck.script}`)).toEqual([i18nCheck]);
  });

  it('throws for unknown checks', () => {
    expect(() => selectQuickChecks(allChecks, 'i18n,nope')).toThrow(
      'Unknown quick check(s): nope. Available checks: i18n, licenses, telemetry'
    );
  });
});

describe('collectCheckResults', () => {
  const runTask = (target: string, status: string, secs = 1): MoonRunReport['actions'][number] => ({
    status,
    duration: { secs, nanos: 500_000_000 },
    node: { action: 'run-task', params: { target } },
  });

  it('maps Moon task results to check results', () => {
    const report: MoonRunReport = {
      actions: [
        { status: 'passed', node: { action: 'sync-workspace' } },
        runTask('quick-checks:i18n', 'passed', 12),
        runTask('quick-checks:licenses', 'failed'),
      ],
    };

    expect(
      collectCheckResults(report, [i18nCheck, licensesCheck], ({ id }) => `${id} output`)
    ).toEqual([
      {
        success: true,
        check: 'i18n',
        script: i18nCheck.script,
        output: 'i18n output',
        durationMs: 12500,
      },
      {
        success: false,
        check: 'licenses',
        script: licensesCheck.script,
        output: 'licenses output',
        durationMs: 1500,
      },
    ]);
  });

  it('fails checks that Moon did not finish', () => {
    const report: MoonRunReport = {
      actions: [runTask('quick-checks:telemetry', 'aborted')],
    };

    expect(collectCheckResults(report, [i18nCheck, telemetryCheck], () => 'output\n')).toEqual([
      {
        success: false,
        check: 'i18n',
        script: i18nCheck.script,
        output: 'Moon did not report a result for this check. See the Moon output above.',
        durationMs: 0,
      },
      {
        success: false,
        check: 'telemetry',
        script: telemetryCheck.script,
        output: "output\nMoon reported status 'aborted' for this check.",
        durationMs: 1500,
      },
    ]);
  });

  it('fails every check without a run report', () => {
    expect(collectCheckResults(undefined, [i18nCheck], () => '')).toEqual([
      expect.objectContaining({ success: false, check: 'i18n' }),
    ]);
  });
});

describe('buildPipelineAnnotation', () => {
  it('creates an annotation for a single failed check', () => {
    const failedChecks = [
      {
        success: false,
        check: 'i18n',
        script: i18nCheck.script,
        output: 'Found 2 i18n errors',
        durationMs: 12000,
      },
    ];

    const annotation = buildPipelineAnnotation(failedChecks);

    expect(annotation).toEqual(
      [
        '## ❌ 1 quick-check(s) failed',
        '',
        'The following quick-check(s) failed. Run them locally to reproduce and fix:',
        '',
        '<details>',
        '<summary>❌ i18n: .buildkite/scripts/steps/checks/i18n.sh (ran in 12s)</summary>',
        '',
        '```',
        'Found 2 i18n errors',
        '```',
        '</details>',
        '',
        'To reproduce locally:',
        '```',
        `node scripts/quick_checks --checks i18n`,
        '```',
      ].join('\n')
    );
  });

  it('creates an annotation for multiple failed checks', () => {
    const failedChecks = [
      {
        success: false,
        check: 'i18n',
        script: i18nCheck.script,
        output: 'Found 2 i18n errors',
        durationMs: 12000,
      },
      {
        success: false,
        check: 'licenses',
        script: licensesCheck.script,
        output: 'Found 1 unapproved license',
        durationMs: 500,
      },
    ];

    const annotation = buildPipelineAnnotation(failedChecks);

    expect(annotation).toContain('## ❌ 2 quick-check(s) failed');
    expect(annotation).toContain(
      '<summary>❌ i18n: .buildkite/scripts/steps/checks/i18n.sh (ran in 12s)</summary>'
    );
    expect(annotation).toContain(
      '<summary>❌ licenses: .buildkite/scripts/steps/checks/licenses.sh (ran in 500ms)</summary>'
    );
    expect(annotation).toContain(`node scripts/quick_checks --checks i18n,licenses`);
  });

  it('truncates long output to the last 50 lines', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i}`);
    const failedChecks = [
      {
        success: false,
        check: 'telemetry',
        script: telemetryCheck.script,
        output: lines.join('\n'),
        durationMs: 1000,
      },
    ];

    const annotation = buildPipelineAnnotation(failedChecks);

    expect(annotation).toContain('… (truncated, showing last 50 lines)');
    expect(annotation).not.toContain('line 9\n');
    expect(annotation).toContain('line 10');
    expect(annotation).toContain('line 59');
  });

  it('does not truncate output within the line limit', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`);
    const failedChecks = [
      {
        success: false,
        check: 'telemetry',
        script: telemetryCheck.script,
        output: lines.join('\n'),
        durationMs: 1000,
      },
    ];

    const annotation = buildPipelineAnnotation(failedChecks);

    expect(annotation).not.toContain('truncated');
    expect(annotation).toContain('line 0');
    expect(annotation).toContain('line 49');
  });
});
