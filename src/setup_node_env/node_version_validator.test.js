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

var exec = require('child_process').exec;
var pkg = require('../../package.json');

var REQUIRED_NODE_JS_VERSION = 'v' + pkg.engines.node;
var INVALID_NODE_JS_VERSION = 'v0.10.0';

describe('NodeVersionValidator', function () {
  it('should run the script WITH error', function (done) {
    var processVersionOverwrite =
      "Object.defineProperty(process, 'version', { value: '" +
      INVALID_NODE_JS_VERSION +
      "', writable: true });";
    var command =
      'node -e "' + processVersionOverwrite + "require('./node_version_validator.js')\"";

    exec(command, { cwd: __dirname }, function (error, stdout, stderr) {
      expect(error.code).toBe(1);
      expect(stderr).toBeDefined();
      expect(stderr).not.toHaveLength(0);
      done();
    });
  });

  it('should run the script WITHOUT error', function (done) {
    var processVersionOverwrite =
      "Object.defineProperty(process, 'version', { value: '" +
      REQUIRED_NODE_JS_VERSION +
      "', writable: true });";
    var command =
      'node -e "' + processVersionOverwrite + "require('./node_version_validator.js')\"";

    exec(command, { cwd: __dirname }, function (error, stdout, stderr) {
      expect(error).toBeNull();
      expect(stderr).toBeDefined();
      expect(stderr).toHaveLength(0);
      done();
    });
  });
});
