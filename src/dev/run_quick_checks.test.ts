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

import { REPO_ROOT } from '@kbn/repo-info';
import { buildPipelineAnnotation } from './run_quick_checks';

describe('buildFailureAnnotation', () => {
  it('creates an annotation for a single failed check', () => {
    const failedChecks = [
      {
        success: false,
        script: `${REPO_ROOT}/.buildkite/scripts/steps/checks/i18n.sh`,
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
        '<summary>❌ .buildkite/scripts/steps/checks/i18n.sh (ran in 12s)</summary>',
        '',
        '```',
        'Found 2 i18n errors',
        '```',
        '</details>',
        '',
        'To reproduce locally:',
        '```',
        `node scripts/quick_checks --checks .buildkite/scripts/steps/checks/i18n.sh`,
        '```',
      ].join('\n')
    );
  });

  it('creates an annotation for multiple failed checks', () => {
    const failedChecks = [
      {
        success: false,
        script: `${REPO_ROOT}/.buildkite/scripts/steps/checks/i18n.sh`,
        output: 'Found 2 i18n errors',
        durationMs: 12000,
      },
      {
        success: false,
        script: `${REPO_ROOT}/.buildkite/scripts/steps/checks/licenses.sh`,
        output: 'Found 1 unapproved license',
        durationMs: 500,
      },
    ];

    const annotation = buildPipelineAnnotation(failedChecks);

    expect(annotation).toContain('## ❌ 2 quick-check(s) failed');
    expect(annotation).toContain(
      '<summary>❌ .buildkite/scripts/steps/checks/i18n.sh (ran in 12s)</summary>'
    );
    expect(annotation).toContain(
      '<summary>❌ .buildkite/scripts/steps/checks/licenses.sh (ran in 500ms)</summary>'
    );
    expect(annotation).toContain(
      `node scripts/quick_checks --checks .buildkite/scripts/steps/checks/i18n.sh,.buildkite/scripts/steps/checks/licenses.sh`
    );
  });

  it('truncates long output to the last 50 lines', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i}`);
    const failedChecks = [
      {
        success: false,
        script: `${REPO_ROOT}/.buildkite/scripts/steps/checks/telemetry.sh`,
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
        script: `${REPO_ROOT}/.buildkite/scripts/steps/checks/telemetry.sh`,
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
