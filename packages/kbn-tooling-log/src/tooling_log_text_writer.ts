/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  /**
   * Log level, messages below this level will be ignored
   */
  level: LogLevel;
  /**
   * List of message sources/ToolingLog types which will be ignored. Create
   * a logger with `ToolingLog#withType()` to create messages with a specific
   * source. Ignored messages will be dropped without writing.
   */
  ignoreSources?: string[];
  /**
   * Target which will receive formatted message lines, a common value for `writeTo`
   * is process.stdout
   */
  writeTo: {
    write(s: string): void;
  };
}

function shouldWriteType(level: ParsedLogLevel, type: MessageTypes) {
  if (type === 'write') {
    return level.name !== 'silent';
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
  private readonly ignoreSources?: string[];

  constructor(config: ToolingLogTextWriterConfig) {
    this.level = parseLogLevel(config.level);
    this.writeTo = config.writeTo;
    this.ignoreSources = config.ignoreSources;

    if (!this.writeTo || typeof this.writeTo.write !== 'function') {
      throw new Error(
        'ToolingLogTextWriter requires the `writeTo` option be set to a stream (like process.stdout)'
      );
    }
  }

  write(msg: Message) {
    if (!shouldWriteType(this.level, msg.type)) {
      return false;
    }

    if (this.ignoreSources && msg.source && this.ignoreSources.includes(msg.source)) {
      if (msg.type === 'write') {
        const txt = format(msg.args[0], ...msg.args.slice(1));
        // Ensure that Elasticsearch deprecation log messages from Kibana aren't ignored
        if (!/elasticsearch\.deprecation/.test(txt)) {
          return false;
        }
      } else {
        return false;
      }
    }

    const prefix = has(MSG_PREFIXES, msg.type) ? MSG_PREFIXES[msg.type] : '';
    ToolingLogTextWriter.write(this.writeTo, prefix, msg);
    return true;
  }

  static write(writeTo: ToolingLogTextWriter['writeTo'], prefix: string, msg: Message) {
    const txt =
      msg.type === 'error'
        ? stringifyError(msg.args[0])
        : format(msg.args[0], ...msg.args.slice(1));

    (prefix + txt).split('\n').forEach((line, i) => {
      let lineIndent = '';

      if (msg.indent > 0) {
        // if we are indenting write some spaces followed by a symbol
        lineIndent += ' '.repeat(msg.indent - 1);
        lineIndent += line.startsWith('-') ? '└' : '│';
      }

      if (line && prefix && i > 0) {
        // apply additional indentation to lines after
        // the first if this message gets a prefix
        lineIndent += PREFIX_INDENT;
      }

      writeTo.write(`${lineIndent}${line}\n`);
    });
  }
}
