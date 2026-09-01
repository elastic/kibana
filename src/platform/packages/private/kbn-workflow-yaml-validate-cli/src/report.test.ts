/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildJsonReport } from './report';
import type { ValidationOutcome } from './types';

const outcome = (over: Partial<ValidationOutcome>): ValidationOutcome => ({
  file: 'file.yaml',
  ok: true,
  isTemplate: false,
  variant: 'strict',
  issues: [],
  ...over,
});

describe('buildJsonReport', () => {
  it('counts warnings separately, and a warnings-only file still counts as passed', () => {
    const report = buildJsonReport('src', [
      outcome({ file: 'clean.yaml', ok: true, issues: [] }),
      outcome({
        file: 'warn.yaml',
        ok: true,
        issues: [
          {
            source: 'liquidjs-expression',
            severity: 'warning',
            message: 'strict validation skipped (liquidjs expression)',
            path: 'steps.0.with.url',
          },
        ],
      }),
      outcome({
        file: 'fail.yaml',
        ok: false,
        issues: [{ source: 'schema', message: 'bad', path: 'steps.0' }],
      }),
    ]);

    expect(report.summary).toEqual({
      total: 3,
      passed: 2,
      failed: 1,
      warnings: 1,
      issues: 2,
    });
  });
});
