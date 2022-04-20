/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import getopts from 'getopts';

import { CliLog, LogLevel } from './log';
import { toError } from './helpers/error';
import { CliError } from './cli_error';

export interface RunContext {
  argv: string[];
  log: CliLog;
}

export interface RunOptions {
  helpText: string;
  defaultLogLevel?: LogLevel;
}

export async function run(main: (ctx: RunContext) => Promise<void>, options: RunOptions) {
  const argv = process.argv.slice(2);
  const rawFlags = getopts(argv);

  const log = new CliLog(
    CliLog.pickLogLevelFromFlags(rawFlags, options.defaultLogLevel),
    process.stdout
  );

  try {
    await main({ argv, log });
  } catch (_) {
    const error = toError(_);
    if (error instanceof CliError) {
      process.exitCode = error.exitCode;
      log.error(error.message);
      if (error.showHelp) {
        process.stdout.write(options.helpText);
      }
    } else {
      log.error('UNHANDLED ERROR', error.stack);
      process.exitCode = 1;
    }
  }
}
