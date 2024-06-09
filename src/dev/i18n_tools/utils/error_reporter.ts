/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { createFailError } from '@kbn/dev-cli-errors';
import { normalizePath } from './helpers';

export interface Context {
  name: string;
}

export class ErrorReporter {
  static stdoutPrefix = chalk.white.bgRed(' I18N ERROR ');

  readonly errors: string[] = [];
  private formatErrorMessage(message: string): string {
    return `${ErrorReporter.stdoutPrefix} ${message}`;
  }
  private report(error: Error, context: Context) {
    this.errors.push(
      `${chalk.white.bgRed(' I18N ERROR ')} Error in ${normalizePath(context.name)}\n${error}`
    );
  }

  private reportFailure(err: string | Error) {
    const failureMessage = this.formatErrorMessage(typeof err === 'string' ? err : err.message);
    return createFailError(failureMessage);
  }

  public hasErrors() {
    return this.errors.length > 0;
  }

  public withContext(context: Context) {
    return {
      // Creates an error that might be recoverable.
      reportError: (error: Error) => this.report(error, context),

      // Creates an error with exit code 1
      reportFailure: (err: string | Error) => this.reportFailure(err),
    };
  }
}
