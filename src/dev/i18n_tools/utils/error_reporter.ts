/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { createFailError } from '@kbn/dev-cli-errors';

export interface Context {
  name: string;
}

export class ErrorReporter {
  static stdoutPrefix = chalk.white.bgRed(' I18N ERROR ');
  readonly errors: string[] = [];
  private readonly context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  private formatErrorMessage(message: string): string {
    return `${ErrorReporter.stdoutPrefix} in ${this.context.name}:\n${message}`;
  }

  public report(err: string | Error) {
    const errorMessage = this.formatErrorMessage(typeof err === 'string' ? err : err.message);
    this.errors.push(errorMessage);
  }

  public reportFailure(err: string | Error) {
    const failureMessage = this.formatErrorMessage(typeof err === 'string' ? err : err.message);
    throw createFailError(failureMessage);
  }

  public hasErrors() {
    return this.errors.length > 0;
  }

  public throwErrors() {
    throw this.reportFailure(this.errors.join('\n'));
  }
}
