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

import { format } from 'util';
import { PassThrough } from 'stream';

import { magentaBright, yellow, red, blue, green, dim } from 'chalk';

import { parseLogLevel } from './log_levels';

export function createToolingLog(initialLogLevelName = 'silent') {
  // current log level (see logLevel.name and logLevel.flags) changed
  // with ToolingLog#setLevel(newLogLevelName);
  let logLevel = parseLogLevel(initialLogLevelName);

  // current indentation level, changed with ToolingLog#indent(delta)
  let indentString = '';

  class ToolingLog extends PassThrough {
    constructor() {
      super({ objectMode: true });
    }

    verbose(...args) {
      if (!logLevel.flags.verbose) return;
      this.write(' %s ', magentaBright('sill'), format(...args));
    }

    debug(...args) {
      if (!logLevel.flags.debug) return;
      this.write(' %s ', dim('debg'), format(...args));
    }

    info(...args) {
      if (!logLevel.flags.info) return;
      this.write(' %s ', blue('info'), format(...args));
    }

    success(...args) {
      if (!logLevel.flags.info) return;
      this.write(' %s ', green('succ'), format(...args));
    }

    warning(...args) {
      if (!logLevel.flags.warning) return;
      this.write(' %s ', yellow('warn'), format(...args));
    }

    error(err) {
      if (!logLevel.flags.error) return;

      if (typeof err !== 'string' && !(err instanceof Error)) {
        err = new Error(`"${err}" thrown`);
      }

      this.write('%s ', red('ERROR'), err.stack || err.message || err);
    }

    indent(delta = 0) {
      const width = Math.max(0, indentString.length + delta);
      indentString = ' '.repeat(width);
      return indentString.length;
    }

    getLevel() {
      return logLevel.name;
    }

    setLevel(newLogLevelName) {
      logLevel = parseLogLevel(newLogLevelName);
    }

    write(...args) {
      format(...args)
        .split('\n')
        .forEach((line, i) => {
          const subLineIndent = i === 0 ? '' : '       ';
          const indent = !indentString
            ? ''
            : indentString.slice(0, -1) +
              (i === 0 && line[0] === '-' ? '└' : '│');
          super.write(`${indent}${subLineIndent}${line}\n`);
        });
    }
  }

  return new ToolingLog();
}
