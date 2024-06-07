/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { normalizePath } from './helpers';

export interface Context {
  name: string;
}

export class ErrorReporter {
  readonly errors: string[] = [];

  withContext(context: Context) {
    return { report: (error: Error) => this.report(error, context) };
  }

  report(error: Error, context: Context) {
    this.errors.push(
      `${chalk.white.bgRed(' I18N ERROR ')} Error in ${normalizePath(context.name)}\n${error}`
    );
  }
}
