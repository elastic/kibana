/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildValidationCliArgs,
  formatReproductionCommand,
  hasValidationRunFlags,
  readValidationRunFlags,
} from './validation_run_cli';

describe('readValidationRunFlags', () => {
  it('reads shared validation flags from flagsReader', () => {
    const flags: Record<string, string> = {
      profile: 'pr',
      scope: 'branch',
      'test-mode': 'affected',
      downstream: 'deep',
      'base-ref': 'origin/main',
      'head-ref': 'HEAD',
    };

    expect(
      readValidationRunFlags({
        string: (name) => flags[name],
      })
    ).toEqual({
      profile: 'pr',
      scope: 'branch',
      testMode: 'affected',
      downstream: 'deep',
      baseRef: 'origin/main',
      headRef: 'HEAD',
    });
  });
});

describe('buildValidationCliArgs', () => {
  it('returns direct-target args when direct target is provided', () => {
    expect(
      buildValidationCliArgs({
        directTarget: {
          flag: '--project',
          value: 'packages/foo/tsconfig.json',
        },
      })
    ).toEqual({
      logArgs: ['--project', 'packages/foo/tsconfig.json'],
      reproductionArgs: ['--project', 'packages/foo/tsconfig.json'],
    });
  });

  it('returns full-profile args when forced to full mode', () => {
    expect(
      buildValidationCliArgs({
        contract: {
          profile: 'branch',
          scope: 'branch',
          testMode: 'affected',
          downstream: 'none',
        },
        forceFullProfile: true,
      })
    ).toEqual({
      logArgs: ['--profile', 'full'],
      reproductionArgs: ['--profile', 'full'],
    });
  });

  it('uses env var reference in log args but resolved SHA in reproduction args for GITHUB_PR_MERGE_BASE', () => {
    expect(
      buildValidationCliArgs({
        contract: {
          profile: 'branch',
          scope: 'branch',
          testMode: 'affected',
          downstream: 'none',
        },
        resolvedBase: {
          base: '2365cc0e7c29d5cc2324cd078a9854866e01e007',
          baseRef: 'GITHUB_PR_MERGE_BASE',
        },
      })
    ).toEqual({
      logArgs: [
        '--profile',
        'branch',
        '--scope',
        'branch',
        '--test-mode',
        'affected',
        '--downstream',
        'none',
        '--base-ref',
        '$GITHUB_PR_MERGE_BASE',
      ],
      reproductionArgs: [
        '--scope',
        'branch',
        '--test-mode',
        'affected',
        '--base-ref',
        '2365cc0e7c29d5cc2324cd078a9854866e01e007',
      ],
    });
  });

  it('includes explicit base for non-default branch inputs', () => {
    expect(
      buildValidationCliArgs({
        contract: {
          profile: 'pr',
          scope: 'branch',
          testMode: 'affected',
          downstream: 'deep',
        },
        resolvedBase: {
          base: 'base-sha',
          baseRef: 'upstream/main',
        },
      })
    ).toEqual({
      logArgs: [
        '--profile',
        'pr',
        '--scope',
        'branch',
        '--test-mode',
        'affected',
        '--downstream',
        'deep',
        '--base-ref',
        'base-sha',
      ],
      reproductionArgs: [
        '--scope',
        'branch',
        '--test-mode',
        'affected',
        '--downstream',
        'deep',
        '--base-ref',
        'base-sha',
      ],
    });
  });
});

describe('hasValidationRunFlags', () => {
  it('detects shared validation flags in raw argv', () => {
    expect(hasValidationRunFlags(['--profile', 'quick'])).toBe(true);
    expect(hasValidationRunFlags(['--scope=branch'])).toBe(true);
    expect(hasValidationRunFlags(['--fix', 'src/foo.ts'])).toBe(false);
  });
});

describe('formatReproductionCommand', () => {
  it('formats a script name with args', () => {
    expect(
      formatReproductionCommand('type_check', ['--scope', 'branch', '--base-ref', 'abc'])
    ).toBe('node scripts/type_check --scope branch --base-ref abc');
  });

  it('formats a script name with no args', () => {
    expect(formatReproductionCommand('type_check', [])).toBe('node scripts/type_check');
  });
});
