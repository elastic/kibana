/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Logs messages and errors
 */
export class Logger {
  /**
   * @param {{silent?: boolean; quiet?: boolean;}} settings
   */
  constructor(settings = {}) {
    this.previousLineEnded = true;
    this.silent = !!settings.silent;
    this.quiet = !!settings.quiet;
  }

  /**
   * @param {string} data
   * @param {boolean} sameLine
   */
  log(data, sameLine = false) {
    if (this.silent || this.quiet) return;

    if (!sameLine && !this.previousLineEnded) {
      process.stdout.write('\n');
    }

    //if data is a stream, pipe it.
    if (data.readable) {
      data.pipe(process.stdout);
      return;
    }

    process.stdout.write(data);
    if (!sameLine) process.stdout.write('\n');
    this.previousLineEnded = !sameLine;
  }

  /**
   * @param {string} data
   */
  error(data) {
    if (this.silent) return;

    if (!this.previousLineEnded) {
      process.stderr.write('\n');
    }

    //if data is a stream, pipe it.
    if (data.readable) {
      data.pipe(process.stderr);
      return;
    }
    process.stderr.write(`${data}\n`);
    this.previousLineEnded = true;
  }
}
