"use strict";

var _child_process = require("child_process");

var _path = require("path");

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
const BASIC_CONFIG = (0, _path.resolve)(__dirname, '../fixtures/simple_project/config.js');
describe('basic config file with a single app and test', function () {
  this.timeout(60 * 1000);
  it('runs and prints expected output', () => {
    const proc = (0, _child_process.spawnSync)(process.execPath, [SCRIPT, '--config', BASIC_CONFIG]);
    const stdout = proc.stdout.toString('utf8');
    (0, _expect.default)(stdout).to.contain('$BEFORE$');
    (0, _expect.default)(stdout).to.contain('$TESTNAME$');
    (0, _expect.default)(stdout).to.contain('$INTEST$');
    (0, _expect.default)(stdout).to.contain('$AFTER$');
  });
});