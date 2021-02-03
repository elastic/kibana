/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import chalk from 'chalk';
import { normalizePath } from '../utils';

export class ErrorReporter {
  errors: string[] = [];

  withContext(context: any) {
    return { report: (error: any) => this.report(error, context) };
  }
  report(error: any, context: any) {
    this.errors.push(
      `${chalk.white.bgRed(' TELEMETRY ERROR ')} Error in ${normalizePath(context.name)}\n${error}`
    );
  }
}
