/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { inspect } from 'util';

import chalk from 'chalk';
import getopts from 'getopts';

export class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
    Error.captureStackTrace(this, CliError);
  }
}

export async function runCli(getHelpText, run) {
  try {
    const userOptions = getopts(process.argv.slice(2)) || {};
    if (userOptions.help) {
      console.log(getHelpText());
      return;
    }

    await run(userOptions);
  } catch (error) {
    if (!(error instanceof Error)) {
      error = new Error(`${inspect(error)} thrown!`);
    }

    console.log();
    console.log(chalk.red(error.message));

    // CliError is a special error class that indicates that the error is produced as a part
    // of using the CLI, and does not need a stack trace to make sense, so we skip the stack
    // trace logging if the error thrown is an instance of this class
    if (!(error instanceof CliError)) {
      // first line in the stack trace is the message, skip it as we log it directly and color it red
      if (error.stack) {
        console.log(error.stack.split('\n').slice(1).join('\n'));
      } else {
        console.log('  (no stack trace)');
      }
    }

    console.log();

    process.exit(error.exitCode || 1);
  }
}
