/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

var exec = require('child_process').exec;
var pkg = require('../../package.json');

var REQUIRED_NODE_JS_VERSION = 'v' + pkg.engines.node;
var INVALID_NODE_JS_VERSION = 'v0.10.0';

// Build a clean env without AI sandbox variables so tests exercise the non-sandbox path
// even when the test runner itself is inside an AI sandbox (e.g. Claude Code).
var cleanEnv = Object.assign({}, process.env);
delete cleanEnv.CLAUDECODE;
delete cleanEnv.CURSOR_AGENT;
delete cleanEnv.CODEX_SANDBOX;

describe('NodeVersionValidator', function () {
  it('should run the script WITH error', function (done) {
    var processVersionOverwrite =
      "Object.defineProperty(process, 'version', { value: '" +
      INVALID_NODE_JS_VERSION +
      "', writable: true });";
    var command =
      'node -e "' + processVersionOverwrite + "require('./node_version_validator.js')\"";

    exec(command, { cwd: __dirname, env: cleanEnv }, function (error, stdout, stderr) {
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

    exec(command, { cwd: __dirname, env: cleanEnv }, function (error, stdout, stderr) {
      expect(error).toBeNull();
      expect(stderr).toBeDefined();
      expect(stderr).toHaveLength(0);
      done();
    });
  });

  it('should warn but not exit in an AI sandbox with wrong version', function (done) {
    var processVersionOverwrite =
      "Object.defineProperty(process, 'version', { value: '" +
      INVALID_NODE_JS_VERSION +
      "', writable: true });";
    var command =
      'node -e "' + processVersionOverwrite + "require('./node_version_validator.js')\"";

    exec(
      command,
      { cwd: __dirname, env: Object.assign({}, cleanEnv, { CLAUDECODE: '1' }) },
      function (error, stdout, stderr) {
        expect(error).toBeNull();
        expect(stdout).toContain('Relaxing the requirement because an AI sandbox was detected');
        expect(stdout).toContain(REQUIRED_NODE_JS_VERSION);
        expect(stderr).toHaveLength(0);
        done();
      }
    );
  });
});
