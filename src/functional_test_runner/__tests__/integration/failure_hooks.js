import { spawnSync } from 'child_process';
import { resolve } from 'path';

import stripAnsi from 'strip-ansi';
import expect from 'expect.js';

const SCRIPT = resolve(__dirname, '../../../../scripts/functional_test_runner.js');
const FAILURE_HOOKS_CONFIG = resolve(__dirname, '../fixtures/failure_hooks/config.js');

describe('failure hooks', function () {
  this.timeout(60 * 1000);

  it('runs and prints expected output', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', FAILURE_HOOKS_CONFIG]);
    const lines = stripAnsi(proc.stdout.toString('utf8')).split(/\r?\n/);
    const tests = [
      {
        flag: '$FAILING_BEFORE_HOOK$',
        assert(lines) {
          expect(lines.shift()).to.match(/info\s+testHookFailure\s+\$FAILING_BEFORE_ERROR\$/);
          expect(lines.shift()).to.match(/info\s+testHookFailureAfterDelay\s+\$FAILING_BEFORE_ERROR\$/);
        }
      },
      {
        flag: '$FAILING_TEST$',
        assert(lines) {
          expect(lines.shift()).to.match(/global before each/);
          expect(lines.shift()).to.match(/info\s+testFailure\s+\$FAILING_TEST_ERROR\$/);
          expect(lines.shift()).to.match(/info\s+testFailureAfterDelay\s+\$FAILING_TEST_ERROR\$/);
        }
      },
      {
        flag: '$FAILING_AFTER_HOOK$',
        assert(lines) {
          expect(lines.shift()).to.match(/info\s+testHookFailure\s+\$FAILING_AFTER_ERROR\$/);
          expect(lines.shift()).to.match(/info\s+testHookFailureAfterDelay\s+\$FAILING_AFTER_ERROR\$/);
        }
      },
    ];

    while (lines.length && tests.length) {
      const line = lines.shift();
      if (line.includes(tests[0].flag)) {
        const test = tests.shift();
        test.assert(lines);
      }
    }

    expect(tests).to.have.length(0);
  });
});
