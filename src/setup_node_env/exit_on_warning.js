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

var EOL = require('os').EOL;

// Be very careful of what you add to this list. Idealy this array should be
// empty, but in certain circumstances, we can allow a warning to be ignored
// temporarily.
//
// Each element in the array is a "rule-object". All rules defined in a
// "rule-object" has to match for a warning to be ignored. Possible rules are:
// `name`, `code`, `message`, `file`, `lines`, and `col`.
//
// The `file`, `line`, and `col` rules will be checked against the top stack
// frame only. Also, `file` doesn't have to match the full path, only the end of
// it.
var IGNORE_WARNINGS = [
  {
    name: 'MaxListenersExceededWarning',
  },
  {
    name: 'DeprecationWarning',
    code: 'DEP0066',
    file: '/node_modules/supertest/node_modules/superagent/lib/node/index.js',
    line: 418,
  },
];

if (process.noProcessWarnings !== true) {
  process.on('warning', function (warn) {
    if (shouldIgnore(warn)) return;

    if (process.traceProcessWarnings === true) {
      console.error('Node.js process-warning detected - Terminating process...');
    } else {
      console.error('Node.js process-warning detected:');
      console.error();
      console.error(warn.stack);
      console.error();
      console.error('Terminating process...');
    }

    process.exit(1);
  });

  // While the above warning listener would also be called on
  // unhandledRejection warnings, we can give a better error message if we
  // handle them separately:
  process.on('unhandledRejection', function (reason) {
    console.error('Unhandled Promise rejection detected:');
    console.error();
    console.error(reason);
    console.error();
    console.error('Terminating process...');
    process.exit(1);
  });
}

function shouldIgnore(warn) {
  warn = parseWarn(warn);
  return IGNORE_WARNINGS.some(function ({ name, code, message, file, line, col }) {
    if (name && name !== warn.name) return false;
    if (code && code !== warn.code) return false;
    if (message && message !== warn.message) return false;
    if (file && !warn.frames[0].file.endsWith(file)) return false;
    if (line && line !== warn.frames[0].line) return false;
    if (col && col !== warn.frames[0].col) return false;
    return true;
  });
}

function parseWarn(warn) {
  var lines = warn.stack.split(EOL);
  return {
    name: warn.name,
    code: warn.code,
    message: lines[0].split(': ')[1],
    frames: parseStack(lines.slice(1)),
  };
}

function parseStack(stack) {
  return stack.map(parseFrame).filter(function (frame) {
    return frame;
  });
}

function parseFrame(frame) {
  // supports the following frame types:
  // - "    at function-name (file-path:1:2)"
  // - "    at function-name (file-path)"
  // - "    at file-path:1:2"
  var match = frame.match(/^    at (?:([^(]+) )?\(?([^:)]+)(?::(\d+):(\d+))?\)?$/);
  if (match === null) return; // in case the stack trace is modified by another module, e.g. jest
  return {
    func: match[1],
    file: match[2],
    line: Number(match[3]),
    col: Number(match[4]),
  };
}
