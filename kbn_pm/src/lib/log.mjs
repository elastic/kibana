/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format } from 'util';

import * as Colors from './colors.mjs';

/** @typedef {import('@kbn/some-dev-log').SomeDevLog} SomeDevLog */

/**
 * @implements {SomeDevLog}
 */
export class Log {
  #flags;

  /**
   *
   * @param {import('@kbn/some-dev-log').SomeLogLevel} level
   */
  constructor(level) {
    this.#flags = {
      error: true,
      success: true,
      info: level !== 'quiet',
      warning: level !== 'quiet',
      debug: level === 'debug' || level === 'verbose',
      verbose: level === 'verbose',
    };
  }

  /**
   * Log an error message
   * @param {string} msg
   * @param  {...any} rest
   */
  error(msg, ...rest) {
    if (this.#flags.error) {
      this._fmt(' ERROR ', Colors.err, msg, rest);
    }
  }

  /**
   * Log a verbose message, only shown when using --verbose
   * @param {string} msg
   * @param  {...any} rest
   */
  warning(msg, ...rest) {
    if (this.#flags.warning) {
      this._fmt('warn', Colors.warning, msg, rest);
    }
  }

  /**
   * Log a standard message to the log
   * @param {string} msg
   * @param  {...any} rest
   */
  info(msg, ...rest) {
    if (this.#flags.info) {
      this._fmt('info', Colors.info, msg, rest);
    }
  }

  /**
   * Log a verbose message, only shown when using --verbose
   * @param {string} msg
   * @param  {...any} rest
   */
  success(msg, ...rest) {
    if (this.#flags.success) {
      this._fmt('success', Colors.success, msg, rest);
    }
  }

  /**
   * Log a debug message, only shown when using --debug or --verbose
   * @param {string} msg
   * @param  {...any} rest
   */
  debug(msg, ...rest) {
    if (this.#flags.debug) {
      this._fmt('debg', Colors.debug, msg, rest);
    }
  }

  /**
   * Log a verbose message, only shown when using --verbose
   * @param {string} msg
   * @param  {...any} rest
   */
  verbose(msg, ...rest) {
    if (this.#flags.verbose) {
      this._fmt('verb', Colors.verbose, msg, rest);
    }
  }

  /**
   * @param {string} tag
   * @param {(txt: string) => string} color
   * @param {string} msg
   * @param {...any} rest
   */
  _fmt(tag, color, msg, rest) {
    const lines = format(msg, ...rest).split('\n');
    const padding = ' '.repeat(tag.length + 1);
    this._write(`${color(tag)} ${lines.map((l, i) => (i > 0 ? `${padding}${l}` : l)).join('\n')}`);
  }

  /**
   * @param {string} txt
   */
  _write(txt) {
    console.log(txt);
  }
}
