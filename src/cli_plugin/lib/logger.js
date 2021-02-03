/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Logs messages and errors
 */
export class Logger {
  constructor(settings = {}) {
    this.previousLineEnded = true;
    this.silent = !!settings.silent;
    this.quiet = !!settings.quiet;
  }

  log(data, sameLine) {
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
