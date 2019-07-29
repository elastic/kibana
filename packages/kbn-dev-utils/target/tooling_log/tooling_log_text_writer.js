"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ToolingLogTextWriter = void 0;

var _util = require("util");

var _chalk = require("chalk");

var _log_levels = require("./log_levels");

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
const PREFIX_INDENT = ' '.repeat(6);
const MSG_PREFIXES = {
  verbose: ` ${(0, _chalk.magentaBright)('sill')} `,
  debug: ` ${(0, _chalk.dim)('debg')} `,
  info: ` ${(0, _chalk.blue)('info')} `,
  success: ` ${(0, _chalk.green)('succ')} `,
  warning: ` ${(0, _chalk.yellow)('warn')} `,
  error: `${(0, _chalk.red)('ERROR')} `
};

function shouldWriteType(level, type) {
  if (type === 'write') {
    return true;
  }

  return Boolean(level.flags[type === 'success' ? 'info' : type]);
}

function stringifyError(error) {
  if (typeof error !== 'string' && !(error instanceof Error)) {
    error = new Error(`"${error}" thrown`);
  }

  return error.stack || error.message || error;
}

class ToolingLogTextWriter {
  constructor(config) {
    this.level = (0, _log_levels.parseLogLevel)(config.level);
    this.writeTo = config.writeTo;

    if (!this.writeTo || typeof this.writeTo.write !== 'function') {
      throw new Error('ToolingLogTextWriter requires the `writeTo` option be set to a stream (like process.stdout)');
    }
  }

  write({
    type,
    indent,
    args
  }) {
    if (!shouldWriteType(this.level, type)) {
      return false;
    }

    const txt = type === 'error' ? stringifyError(args[0]) : (0, _util.format)(...args);
    const prefix = MSG_PREFIXES[type] || '';
    (prefix + txt).split('\n').forEach((line, i) => {
      let lineIndent = '';

      if (indent > 0) {
        // if we are indenting write some spaces followed by a symbol
        lineIndent += ' '.repeat(indent - 1);
        lineIndent += line.startsWith('-') ? '└' : '│';
      }

      if (line && prefix && i > 0) {
        // apply additional indentation to lines after
        // the first if this message gets a prefix
        lineIndent += PREFIX_INDENT;
      }

      this.writeTo.write(`${lineIndent}${line}\n`);
    });
    return true;
  }

}

exports.ToolingLogTextWriter = ToolingLogTextWriter;