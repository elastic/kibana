"use strict";

var _child_process = require("child_process");

var _path = require("path");

var _stripAnsi = _interopRequireDefault(require("strip-ansi"));

var _expect = _interopRequireDefault(require("@kbn/expect"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
const SCRIPT = (0, _path.resolve)(__dirname, '../../../../scripts/functional_test_runner.js');
const FAILURE_HOOKS_CONFIG = (0, _path.resolve)(__dirname, '../fixtures/failure_hooks/config.js');
describe('failure hooks', function () {
  this.timeout(60 * 1000);
  it('runs and prints expected output', () => {
    const proc = (0, _child_process.spawnSync)(process.execPath, [SCRIPT, '--config', FAILURE_HOOKS_CONFIG]);
    const lines = (0, _stripAnsi.default)(proc.stdout.toString('utf8')).split(/\r?\n/);
    const tests = [{
      flag: '$FAILING_BEFORE_HOOK$',

      assert(lines) {
        (0, _expect.default)(lines.shift()).to.match(/info\s+testHookFailure\s+\$FAILING_BEFORE_ERROR\$/);
        (0, _expect.default)(lines.shift()).to.match(/info\s+testHookFailureAfterDelay\s+\$FAILING_BEFORE_ERROR\$/);
      }

    }, {
      flag: '$FAILING_TEST$',

      assert(lines) {
        (0, _expect.default)(lines.shift()).to.match(/global before each/);
        (0, _expect.default)(lines.shift()).to.match(/info\s+testFailure\s+\$FAILING_TEST_ERROR\$/);
        (0, _expect.default)(lines.shift()).to.match(/info\s+testFailureAfterDelay\s+\$FAILING_TEST_ERROR\$/);
      }

    }, {
      flag: '$FAILING_AFTER_HOOK$',

      assert(lines) {
        (0, _expect.default)(lines.shift()).to.match(/info\s+testHookFailure\s+\$FAILING_AFTER_ERROR\$/);
        (0, _expect.default)(lines.shift()).to.match(/info\s+testHookFailureAfterDelay\s+\$FAILING_AFTER_ERROR\$/);
      }

    }];

    while (lines.length && tests.length) {
      const line = lines.shift();

      if (line.includes(tests[0].flag)) {
        const test = tests.shift();
        test.assert(lines);
      }
    }

    (0, _expect.default)(tests).to.have.length(0);
  });
});