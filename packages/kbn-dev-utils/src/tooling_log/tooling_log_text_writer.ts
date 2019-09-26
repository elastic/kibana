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

import chalk from 'chalk';

import { LogLevel, parseLogLevel, ParsedLogLevel } from './log_levels';
import { Writer } from './writer';
import { Message, MessageTypes } from './message';

const { magentaBright, yellow, red, blue, green, dim } = chalk;
const PREFIX_INDENT = ' '.repeat(6);
const MSG_PREFIXES = {
  verbose: ` ${magentaBright('sill')} `,
  debug: ` ${dim('debg')} `,
  info: ` ${blue('info')} `,
  success: ` ${green('succ')} `,
  warning: ` ${yellow('warn')} `,
  error: `${red('ERROR')} `,
};

const has = <T extends object>(obj: T, key: any): key is keyof T => obj.hasOwnProperty(key);

export interface ToolingLogTextWriterConfig {
  level: LogLevel;
  writeTo: {
    write(s: string): void;
  };
}

function shouldWriteType(level: ParsedLogLevel, type: MessageTypes) {
  if (type === 'write') {
    return true;
  }

  return Boolean(level.flags[type === 'success' ? 'info' : type]);
}

function stringifyError(error: string | Error) {
  if (typeof error !== 'string' && !(error instanceof Error)) {
    error = new Error(`"${error}" thrown`);
  }

  if (typeof error === 'string') {
    return error;
  }

  return error.stack || error.message || error;
}

export class ToolingLogTextWriter implements Writer {
  public readonly level: ParsedLogLevel;
  public readonly writeTo: {
    write(msg: string): void;
  };

  constructor(config: ToolingLogTextWriterConfig) {
    this.level = parseLogLevel(config.level);
    this.writeTo = config.writeTo;

    if (!this.writeTo || typeof this.writeTo.write !== 'function') {
      throw new Error(
        'ToolingLogTextWriter requires the `writeTo` option be set to a stream (like process.stdout)'
      );
    }
  }

  write({ type, indent, args }: Message) {
    if (!shouldWriteType(this.level, type)) {
      return false;
    }

    const txt = type === 'error' ? stringifyError(args[0]) : format(args[0], ...args.slice(1));
    const prefix = has(MSG_PREFIXES, type) ? MSG_PREFIXES[type] : '';

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
