"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runTestsCli = runTestsCli;

var _tasks = require("../../tasks");

var _lib = require("../../lib");

var _args = require("./args");

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

/**
 * Run servers and tests for each config
 * Only cares about --config option. Other options
 * are passed directly to functional_test_runner, such as
 * --bail, --verbose, etc.
 * @param {string[]} defaultConfigPaths Optional paths to configs
 *                                      if no config option is passed
 */
async function runTestsCli(defaultConfigPaths) {
  await (0, _lib.runCli)(_args.displayHelp, async userOptions => {
    const options = (0, _args.processOptions)(userOptions, defaultConfigPaths);
    await (0, _tasks.runTests)(options);
  });
}