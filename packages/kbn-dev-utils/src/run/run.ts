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

// @ts-ignore @types are outdated and module is super simple
import exitHook from 'exit-hook';

import { pickLevelFromFlags, ToolingLog, LogLevel } from '../tooling_log';
import { createFlagError, isFailError } from './fail';
import { Flags, getFlags, getHelp } from './flags';
import { ProcRunner, withProcRunner } from '../proc_runner';

type CleanupTask = () => void;
type RunFn = (args: {
  log: ToolingLog;
  flags: Flags;
  procRunner: ProcRunner;
  addCleanupTask: (task: CleanupTask) => void;
}) => Promise<void> | void;

export interface Options {
  usage?: string;
  description?: string;
  log?: {
    defaultLevel?: LogLevel;
  };
  flags?: {
    allowUnexpected?: boolean;
    guessTypesForUnexpectedFlags?: boolean;
    help?: string;
    alias?: { [key: string]: string | string[] };
    boolean?: string[];
    string?: string[];
    default?: { [key: string]: any };
  };
}

export async function run(fn: RunFn, options: Options = {}) {
  const flags = getFlags(process.argv.slice(2), options);

  if (flags.help) {
    process.stderr.write(getHelp(options));
    process.exit(1);
  }

  const log = new ToolingLog({
    level: pickLevelFromFlags(flags, {
      default: options.log?.defaultLevel,
    }),
    writeTo: process.stdout,
  });

  process.on('unhandledRejection', (error) => {
    log.error('UNHANDLED PROMISE REJECTION');
    log.error(
      error instanceof Error
        ? error
        : new Error(`non-Error type rejection value: ${inspect(error)}`)
    );
    process.exit(1);
  });

  const handleErrorWithoutExit = (error: any) => {
    if (isFailError(error)) {
      log.error(error.message);

      if (error.showHelp) {
        log.write(getHelp(options));
      }

      process.exitCode = error.exitCode;
    } else {
      log.error('UNHANDLED ERROR');
      log.error(error);
      process.exitCode = 1;
    }
  };

  const doCleanup = () => {
    const tasks = cleanupTasks.slice(0);
    cleanupTasks.length = 0;

    for (const task of tasks) {
      try {
        task();
      } catch (error) {
        handleErrorWithoutExit(error);
      }
    }
  };

  const unhookExit: CleanupTask = exitHook(doCleanup);
  const cleanupTasks: CleanupTask[] = [unhookExit];

  try {
    if (!options.flags?.allowUnexpected && flags.unexpected.length) {
      throw createFlagError(`Unknown flag(s) "${flags.unexpected.join('", "')}"`);
    }

    try {
      await withProcRunner(log, async (procRunner) => {
        await fn({
          log,
          flags,
          procRunner,
          addCleanupTask: (task: CleanupTask) => cleanupTasks.push(task),
        });
      });
    } finally {
      doCleanup();
    }
  } catch (error) {
    handleErrorWithoutExit(error);
    process.exit();
  }
}
