/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

import stripAnsi from 'strip-ansi';
import expect from '@kbn/expect';
import { REPO_ROOT } from '@kbn/dev-utils';

const SCRIPT = resolve(REPO_ROOT, 'scripts/functional_test_runner.js');
const FAILURE_HOOKS_CONFIG = require.resolve('../fixtures/failure_hooks/config.js');

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
          expect(lines.shift()).to.match(
            /info\s+testHookFailureAfterDelay\s+\$FAILING_BEFORE_ERROR\$/
          );
        },
      },
      {
        flag: '$FAILING_TEST$',
        assert(lines) {
          expect(lines.shift()).to.match(/global before each/);
          expect(lines.shift()).to.match(/info\s+testFailure\s+\$FAILING_TEST_ERROR\$/);
          expect(lines.shift()).to.match(/info\s+testFailureAfterDelay\s+\$FAILING_TEST_ERROR\$/);
        },
      },
      {
        flag: '$FAILING_AFTER_HOOK$',
        assert(lines) {
          expect(lines.shift()).to.match(/info\s+testHookFailure\s+\$FAILING_AFTER_ERROR\$/);
          expect(lines.shift()).to.match(
            /info\s+testHookFailureAfterDelay\s+\$FAILING_AFTER_ERROR\$/
          );
        },
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
