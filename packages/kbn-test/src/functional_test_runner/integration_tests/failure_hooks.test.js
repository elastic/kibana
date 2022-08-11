/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

import stripAnsi from 'strip-ansi';
import { REPO_ROOT } from '@kbn/utils';

const SCRIPT = resolve(REPO_ROOT, 'scripts/functional_test_runner.js');
const FAILURE_HOOKS_CONFIG = require.resolve('./__fixtures__/failure_hooks/config.js');

describe('failure hooks', function () {
  it('runs and prints expected output', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', FAILURE_HOOKS_CONFIG]);
    const lines = stripAnsi(proc.stdout.toString('utf8')).split(/\r?\n/);
    const linesCopy = [...lines];

    const tests = [
      {
        flag: '"before all" hook: $FAILING_BEFORE_HOOK$',
        assert(lines) {
          expect(lines.shift()).toMatch(/info\s+testHookFailure\s+\$FAILING_BEFORE_ERROR\$/);
          expect(lines.shift()).toMatch(
            /info\s+testHookFailureAfterDelay\s+\$FAILING_BEFORE_ERROR\$/
          );
        },
      },
      {
        flag: '└-> $FAILING_TEST$',
        assert(lines) {
          expect(lines.shift()).toMatch(/global before each/);
          expect(lines.shift()).toMatch(/info\s+testFailure\s+\$FAILING_TEST_ERROR\$/);
          expect(lines.shift()).toMatch(/info\s+testFailureAfterDelay\s+\$FAILING_TEST_ERROR\$/);
        },
      },
      {
        flag: '"after all" hook: $FAILING_AFTER_HOOK$',
        assert(lines) {
          expect(lines.shift()).toMatch(/info\s+testHookFailure\s+\$FAILING_AFTER_ERROR\$/);
          expect(lines.shift()).toMatch(
            /info\s+testHookFailureAfterDelay\s+\$FAILING_AFTER_ERROR\$/
          );
        },
      },
    ];

    try {
      while (lines.length && tests.length) {
        const line = lines.shift();
        if (line.includes(tests[0].flag)) {
          const test = tests.shift();
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
