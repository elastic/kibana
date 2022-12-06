/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Util from 'util';

import { bold, dim, blueBright, yellowBright, gray, bgRed } from 'chalk';
import getopts from 'getopts';
import ts from 'typescript';
import stripAnsi from 'strip-ansi';

import { Logger } from './logger';
import { describeNode, describeSymbol } from '../ts_helpers';

const LOG_LEVEL_RANKS = {
  silent: 0,
  quiet: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

/**
 * Level that the logger is running at, any message logged "above" this level will be dropped
 */
export type LogLevel = keyof typeof LOG_LEVEL_RANKS;

const LOG_LEVELS = (Object.keys(LOG_LEVEL_RANKS) as LogLevel[]).sort(
  (a, b) => LOG_LEVEL_RANKS[a] - LOG_LEVEL_RANKS[b]
);
const LOG_LEVELS_DESC = LOG_LEVELS.slice().reverse();

type LogLevelMap = { [k in LogLevel]: boolean };

const now =
  typeof performance !== 'undefined' ? performance.now.bind(performance) : Date.now.bind(Date);

const fmt = (prefix: string, msg: string, ...args: string[]) => {
  const lines = Util.format(msg, ...args).split('\n');

  let formatted = lines[0];
  if (lines.length > 1) {
    const padding = ' '.repeat(stripAnsi(prefix).length + 1);
    for (const line of lines.slice(1)) {
      formatted += `\n${padding}${line}`;
    }
  }

  return `${prefix} ${formatted}\n`;
};

const fmtMs = (ms: number) => {
  if (ms < 1) {
    return dim(`${Math.floor(ms * 100)}µs`);
  }

  if (ms <= 5) {
    return dim(`${Math.round(ms)}ms`);
  }

  if (ms <= 500) {
    return `${Math.round(ms)}ms`;
  }

  return bold.yellow(`${(ms / 1000).toFixed(2)}s`);
};

const fmtDesc = (desc: string | ts.Symbol | ts.Node) => {
  if (typeof desc === 'string') {
    return Path.isAbsolute(desc) ? Path.relative(process.cwd(), desc) : desc;
  }

  return 'kind' in desc ? describeNode(desc) : describeSymbol(desc);
};

/**
 * Interface of objects which receive log messages, often times points to stdout, but
 * replaced with a log message collector in tests
 */
export interface LogWriter {
  write(chunk: string): void;
}

interface Step {
  verboseSteps: Map<string, { count: number; ms: number }>;
}

/**
 * Logger which writes messages in a text format designed for CLIs
 */
export class CliLog implements Logger {
  private indent = '';
  private readonly stepStack: Step[] = [];

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
  constructor(
    public readonly level: LogLevel,
    private readonly writeTo: LogWriter,
    private readonly writeTimes = true
  ) {
    this.map = CliLog.parseLogLevel(level);
  }

  info(msg: string, ...args: any[]) {
    if (this.map.info) {
      this.writeTo.write(fmt(`${this.indent}${blueBright('info')}`, msg, ...args));
    }
  }

  warn(msg: string, ...args: any[]) {
    if (this.map.quiet) {
      this.writeTo.write(fmt(`${this.indent}${yellowBright('warn')}`, msg, ...args));
    }
  }

  error(msg: string, ...args: any[]) {
    if (this.map.quiet) {
      this.writeTo.write(fmt(`${this.indent}${bgRed.whiteBright('ERROR')}`, msg, ...args));
    }
  }

  debug(msg: string, ...args: any[]) {
    if (this.map.debug) {
      this.writeTo.write(fmt(`${this.indent}${gray('debg')}`, msg, ...args));
    }
  }

  verbose(msg: string, ...args: any[]) {
    if (this.map.verbose) {
      this.writeTo.write(fmt(`${this.indent}${dim('verb')}`, msg, ...args));
    }
  }

  success(msg: string, ...args: any[]): void {
    if (this.map.quiet) {
      this.writeTo.write(fmt(`${this.indent}✅`, msg, ...args));
    }
  }

  step<T>(name: string, desc: ts.Symbol | ts.Node | string | null, block: () => T): T {
    return this.stepImpl('debug', name, desc, block);
  }

  verboseStep<T>(name: string, desc: string | ts.Symbol | ts.Node | null, block: () => T): T {
    if (!this.map.debug) {
      return block();
    }

    if (!this.stepStack.length || this.map.verbose) {
      return this.stepImpl('verbose', name, desc, block);
    }

    const step = this.stepStack[0];
    const start = now();
    try {
      return block();
    } finally {
      const ms = now() - start;
      const group = step.verboseSteps.get(name);
      if (group) {
        group.count += 1;
        group.ms += ms;
      } else {
        step.verboseSteps.set(name, {
          count: 1,
          ms,
        });
      }
    }
  }

  private stepImpl<T>(
    level: 'debug' | 'verbose',
    name: string,
    desc: string | ts.Symbol | ts.Node | null,
    block: () => T
  ): T {
    if (!this.map[level]) {
      return block();
    }

    if (desc !== null) {
      this[level]('>', bold(name), dim(`-- ${fmtDesc(desc)}`));
    } else {
      this[level]('>', bold(name));
    }

    const start = now();
    let success = true;
    const prevIndent = this.indent;
    this.indent = ' '.repeat(prevIndent.length + 4);

    const verboseSteps = new Map();
    this.stepStack.unshift({ verboseSteps });

    try {
      return block();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const ms = now() - start;

      this.stepStack.shift();
      if (verboseSteps.size) {
        const summary = [];
        for (const [step, { count, ms: m }] of verboseSteps) {
          summary.push(`${step}x${count}${this.writeTimes ? `: ${fmtMs(m)}` : ''}`);
        }
        this[level](dim(`verbose steps:\n${summary.join('\n')}`));
      }

      if (this.writeTimes) {
        this[level](success ? fmtMs(ms) : `‼️  ${fmtMs(ms)}`);
      }

      this.indent = prevIndent;
    }
  }
}
