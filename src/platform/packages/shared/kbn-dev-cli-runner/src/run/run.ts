/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import { withProcRunner } from '@kbn/dev-proc-runner';
import { ToolingLog, pickLevelFromFlags } from '@kbn/tooling-log';
import { Cleanup } from '../cleanup';
import { DEFAULT_FLAG_ALIASES, getFlags } from '../flags/flags';
import { FlagsReader } from '../flags/flags_reader';
import { getHelp } from '../help';
import { Metrics } from '../metrics';
import type { RunFn, RunOptions } from './types';
import type { FlagOptions, Flags, FlagsOf } from '../flags/types';

export async function run<T, TFlagOptions extends FlagOptions = FlagOptions>(
  fn: RunFn<T, FlagsOf<TFlagOptions>>,
  options?: RunOptions<TFlagOptions>
): Promise<T | undefined>;

export async function run<T>(
  fn: RunFn<T, Flags>,
  options: RunOptions = {}
): Promise<T | undefined> {
  const flags = getFlags(process.argv.slice(2), options.flags, options.log?.defaultLevel);
  const log = new ToolingLog(
    {
      level: pickLevelFromFlags(flags, {
        default: options.log?.defaultLevel,
      }),
      writeTo: process.stdout,
    },
    {
      context: options.log?.context,
    }
  );

  const metrics = new Metrics(log);
  const helpText = getHelp({
    description: options.description,
    usage: options.usage,
    flagHelp: options.flags?.help,
    defaultLogLevel: options.log?.defaultLevel,
    examples: options.flags?.examples,
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

  let result: T | undefined;
  try {
    await withProcRunner(log, async (procRunner) => {
      result =
        (await fn({
          log,
          flags,
          procRunner,
          statsMeta: metrics.meta,
          addCleanupTask: cleanup.add.bind(cleanup),
          flagsReader: new FlagsReader(flags, {
            aliases: {
              ...options.flags?.alias,
              ...DEFAULT_FLAG_ALIASES,
            },
          }),
        })) || undefined;
    });
  } catch (error) {
    cleanup.execute(error);
    await metrics.reportError(error?.message);
    // process.exitCode is set by `cleanup` when necessary
    process.exit();
  } finally {
    cleanup.execute();
  }

  await metrics.reportSuccess();

  return result;
}
