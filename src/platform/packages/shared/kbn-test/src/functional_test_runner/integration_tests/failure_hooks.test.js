/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

import stripAnsi from 'strip-ansi';
import { REPO_ROOT } from '@kbn/repo-info';

const SCRIPT = resolve(REPO_ROOT, 'scripts/functional_test_runner.js');
const FAILURE_HOOKS_CONFIG = require.resolve('./__fixtures__/failure_hooks/config.js');

describe('failure hooks', function () {
  it('runs and prints expected output', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', FAILURE_HOOKS_CONFIG], {
      // this FTR run should not produce a scout report
      env: { ...process.env, SCOUT_REPORTER_ENABLED: '0' },
    });
    const lines = stripAnsi(proc.stdout.toString('utf8')).split(/\r?\n/);
    const linesCopy = [...lines];

    const tests = [
      {
        flag: 'testHookFailure $FAILING_BEFORE_ERROR$',
        assert(lines) {
          expect(lines.shift()).toMatch(
            /info\s+testHookFailure\s+\$FAILING_BEFORE_ERROR\$.*failing before hook/
          );
          expect(lines.shift()).toMatch(
            /info\s+testHookFailureAfterDelay\s+\$FAILING_BEFORE_ERROR\$.*failing before hook/
          );
        },
      },
      {
        flag: 'testFailure $FAILING_TEST_ERROR$',
        assert(lines) {
          expect(lines.shift()).toMatch(
            /info\s+testFailure\s+\$FAILING_TEST_ERROR\$.*failing test/
          );
          expect(lines.shift()).toMatch(
            /info\s+testFailureAfterDelay\s+\$FAILING_TEST_ERROR\$.*failing test/
          );
        },
      },
      {
        flag: 'testHookFailure $FAILING_AFTER_ERROR$',
        assert(lines) {
          expect(lines.shift()).toMatch(
            /info\s+testHookFailure\s+\$FAILING_AFTER_ERROR\$.*failing after hook/
          );
          expect(lines.shift()).toMatch(
            /info\s+testHookFailureAfterDelay\s+\$FAILING_AFTER_ERROR\$.*failing after hook/
          );
        },
      },
    ];

    try {
      while (lines.length && tests.length) {
        const line = lines.shift();
        if (line.includes(tests[0].flag)) {
          const test = tests.shift();
          // Check if the current line is a testHookFailure line that should be asserted
          if (line.includes('testHookFailure') || line.includes('testFailure')) {
            // Put the line back so assert() can check it
            lines.unshift(line);
          }
          test.assert(lines);
        }
      }

      expect(tests).toHaveLength(0);
    } catch (error) {
      error.message += `\n\nfull log output:${linesCopy.join('\n')}`;
      throw error;
    }
  });
});
