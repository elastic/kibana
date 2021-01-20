/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { pickLevelFromFlags, ToolingLog, LogLevel } from '../tooling_log';
import { createFlagError } from './fail';
import { Flags, getFlags, FlagOptions } from './flags';
import { ProcRunner, withProcRunner } from '../proc_runner';
import { getHelp } from './help';
import { CleanupTask, Cleanup } from './cleanup';

export interface RunContext {
  log: ToolingLog;
  flags: Flags;
  procRunner: ProcRunner;
  addCleanupTask: (task: CleanupTask) => void;
}
export type RunFn = (context: RunContext) => Promise<void> | void;

export interface RunOptions {
  usage?: string;
  description?: string;
  log?: {
    defaultLevel?: LogLevel;
  };
  flags?: FlagOptions;
}

export async function run(fn: RunFn, options: RunOptions = {}) {
  const flags = getFlags(process.argv.slice(2), options.flags);
  const helpText = getHelp({
    description: options.description,
    usage: options.usage,
    flagHelp: options.flags?.help,
  });

  const log = new ToolingLog({
    level: pickLevelFromFlags(flags, {
      default: options.log?.defaultLevel,
    }),
    writeTo: process.stdout,
  });

  if (flags.help) {
    log.write(helpText);
    process.exit();
  }

  const cleanup = Cleanup.setup(log, helpText);

  if (!options.flags?.allowUnexpected && flags.unexpected.length) {
    const error = createFlagError(`Unknown flag(s) "${flags.unexpected.join('", "')}"`);
    cleanup.execute(error);
    return;
  }

  try {
    await withProcRunner(log, async (procRunner) => {
      await fn({
        log,
        flags,
        procRunner,
        addCleanupTask: cleanup.add.bind(cleanup),
      });
    });
  } catch (error) {
    cleanup.execute(error);
    // process.exitCode is set by `cleanup` when necessary
    process.exit();
  } finally {
    cleanup.execute();
  }
}
