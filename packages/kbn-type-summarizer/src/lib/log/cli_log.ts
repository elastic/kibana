/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format } from 'util';
import { dim, blueBright, yellowBright, redBright, gray } from 'chalk';
import getopts from 'getopts';

import { Logger } from './logger';

const LOG_LEVEL_RANKS = {
  silent: 0,
  quiet: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};
export type LogLevel = keyof typeof LOG_LEVEL_RANKS;
const LOG_LEVELS = (Object.keys(LOG_LEVEL_RANKS) as LogLevel[]).sort(
  (a, b) => LOG_LEVEL_RANKS[a] - LOG_LEVEL_RANKS[b]
);
const LOG_LEVELS_DESC = LOG_LEVELS.slice().reverse();

type LogLevelMap = { [k in LogLevel]: boolean };

export interface LogWriter {
  write(chunk: string): void;
}

export class CliLog implements Logger {
  static parseLogLevel(level: LogLevel) {
    if (!LOG_LEVELS.includes(level)) {
      throw new Error('invalid log level');
    }

    const rank = LOG_LEVEL_RANKS[level];
    return Object.fromEntries(
      LOG_LEVELS.map((l) => [l, LOG_LEVEL_RANKS[l] <= rank])
    ) as LogLevelMap;
  }

  static pickLogLevelFromFlags(
    flags: getopts.ParsedOptions,
    defaultLogLevl: LogLevel = 'info'
  ): LogLevel {
    for (const level of LOG_LEVELS_DESC) {
      if (Object.prototype.hasOwnProperty.call(flags, level) && flags[level] === true) {
        return level;
      }
    }

    return defaultLogLevl;
  }

  private readonly map: LogLevelMap;
  constructor(public readonly level: LogLevel, private readonly writeTo: LogWriter) {
    this.map = CliLog.parseLogLevel(level);
  }

  info(msg: string, ...args: any[]) {
    if (this.map.info) {
      this.writeTo.write(`${blueBright('info')} ${format(msg, ...args)}\n`);
    }
  }

  warn(msg: string, ...args: any[]) {
    if (this.map.quiet) {
      this.writeTo.write(`${yellowBright('warning')} ${format(msg, ...args)}\n`);
    }
  }

  error(msg: string, ...args: any[]) {
    if (this.map.quiet) {
      this.writeTo.write(`${redBright('error')} ${format(msg, ...args)}\n`);
    }
  }

  debug(msg: string, ...args: any[]) {
    if (this.map.debug) {
      this.writeTo.write(`${gray('debug')} ${format(msg, ...args)}\n`);
    }
  }

  verbose(msg: string, ...args: any[]) {
    if (this.map.verbose) {
      this.writeTo.write(`${dim('verbose')}: ${format(msg, ...args)}\n`);
    }
  }

  success(msg: string, ...args: any[]): void {
    if (this.map.quiet) {
      this.writeTo.write(`✅ ${format(msg, ...args)}\n`);
    }
  }
}
