/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This is the script that's run by `yarn kbn`. This script has as little logic
 * as possible so that it can:
 *  - run without being built and without any dependencies
 *  - can bootstrap the repository, installing all deps and building all packages
 *  - load additional commands from packages which will extend the functionality
 *    beyond bootstrapping
 */

import { Args } from './lib/args.mjs';
import { getHelp } from './lib/help.mjs';
import { createFlagError, isCliError } from './lib/cli_error.mjs';
import { checkIfRunningNativelyOnWindows } from './lib/windows.mjs';
import { getCmd } from './commands/index.mjs';
import { Log } from './lib/log.mjs';
import External from './lib/external_packages.js';

const start = Date.now();
const args = new Args(process.argv.slice(2), []);
const log = new Log(args.getLoggingLevel());
const cmdName = args.getCommandName();

/**
 * @param {import('./lib/log.mjs').Log} log
 */
async function tryToGetCiStatsReporter(log) {
  try {
    const { CiStatsReporter } = External['@kbn/ci-stats-reporter']();
    return CiStatsReporter.fromEnv(log);
  } catch {
    return;
  }
}

try {
  checkIfRunningNativelyOnWindows(log);
  const cmd = getCmd(cmdName);

  if (cmdName && !cmd) {
    throw createFlagError(`Invalid command name [${cmdName}]`);
  }

  if (args.getBooleanValue('help')) {
    log._write(await getHelp(cmdName));
    process.exit(0);
  }

  if (!cmd) {
    throw createFlagError('missing command name');
  }

  /** @type {import('@kbn/ci-stats-reporter').CiStatsTiming[]} */
  const timings = [];

  /** @type {import('./lib/command').CommandRunContext['time']} */
  const time = async (id, block) => {
    if (!cmd.reportTimings) {
      return await block();
    }

    const start = Date.now();
    log.verbose(`[${id}]`, 'start');
    const [result] = await Promise.allSettled([block()]);
    const ms = Date.now() - start;
    log.verbose(`[${id}]`, result.status === 'fulfilled' ? 'success' : 'failure', 'in', ms, 'ms');
    timings.push({
      group: cmd.reportTimings.group,
      id,
      ms,
      meta: {
        success: result.status === 'fulfilled',
      },
    });

    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      throw result.reason;
    }
  };

  const [result] = await Promise.allSettled([
    (async () =>
      await cmd.run({
        args,
        log,
        time,
      }))(),
  ]);

  if (cmd.reportTimings) {
    timings.push({
      group: cmd.reportTimings.group,
      id: cmd.reportTimings.id,
      ms: Date.now() - start,
      meta: {
        success: result.status === 'fulfilled',
      },
    });
  }

  if (timings.length) {
    const reporter = await tryToGetCiStatsReporter(log);
    if (reporter) {
      await reporter.timings({ timings });
    }
  }

  if (result.status === 'rejected') {
    throw result.reason;
  }
} catch (error) {
  if (!isCliError(error)) {
    throw error;
  }

  log.error(`[${cmdName}] failed: ${error.message}`);

  if (error.showHelp) {
    log._write('');
    log._write(await getHelp(cmdName));
  }

  process.exit(error.exitCode ?? 1);
}
