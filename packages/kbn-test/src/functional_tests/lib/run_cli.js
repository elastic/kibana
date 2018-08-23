/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
        console.log(
          error.stack
            .split('\n')
            .slice(1)
            .join('\n')
        );
      } else {
        console.log('  (no stack trace)');
      }
    }

    console.log();

    process.exit(error.exitCode || 1);
  }
}
