"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OPTIMIZE_BUNDLE_DIR = exports.API_CONFIG_PATH = exports.FUNCTIONAL_CONFIG_PATH = exports.PROJECT_ROOT = exports.KIBANA_FTR_SCRIPT = exports.KIBANA_ROOT = exports.KIBANA_EXEC_PATH = exports.KIBANA_EXEC = void 0;

var _path = require("path");

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
// resolve() treats relative paths as relative to process.cwd(),
// so to return a relative path we use relative()
function resolveRelative(path) {
  return (0, _path.relative)(process.cwd(), (0, _path.resolve)(path));
}

const KIBANA_EXEC = 'node';
exports.KIBANA_EXEC = KIBANA_EXEC;
const KIBANA_EXEC_PATH = resolveRelative('scripts/kibana');
exports.KIBANA_EXEC_PATH = KIBANA_EXEC_PATH;
const KIBANA_ROOT = (0, _path.resolve)(__dirname, '../../../../../');
exports.KIBANA_ROOT = KIBANA_ROOT;
const KIBANA_FTR_SCRIPT = (0, _path.resolve)(KIBANA_ROOT, 'scripts/functional_test_runner');
exports.KIBANA_FTR_SCRIPT = KIBANA_FTR_SCRIPT;
const PROJECT_ROOT = (0, _path.resolve)(__dirname, '../../../../../../');
exports.PROJECT_ROOT = PROJECT_ROOT;
const FUNCTIONAL_CONFIG_PATH = (0, _path.resolve)(KIBANA_ROOT, 'test/functional/config');
exports.FUNCTIONAL_CONFIG_PATH = FUNCTIONAL_CONFIG_PATH;
const API_CONFIG_PATH = (0, _path.resolve)(KIBANA_ROOT, 'test/api_integration/config');
exports.API_CONFIG_PATH = API_CONFIG_PATH;
const OPTIMIZE_BUNDLE_DIR = (0, _path.resolve)(KIBANA_ROOT, 'optimize/bundles');
exports.OPTIMIZE_BUNDLE_DIR = OPTIMIZE_BUNDLE_DIR;