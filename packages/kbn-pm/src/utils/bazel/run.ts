/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import execa from 'execa';
import * as Rx from 'rxjs';
import { tap } from 'rxjs/operators';
import { observeLines } from '@kbn/dev-utils/stdio';
import { spawn } from '../child_process';
import { log } from '../log';
import { CliError } from '../errors';

type BazelCommandRunner = 'bazel' | 'ibazel';

async function runBazelCommandWithRunner(
  bazelCommandRunner: BazelCommandRunner,
  bazelArgs: string[],
  offline: boolean = false,
  runOpts: execa.Options = {}
) {
  // Force logs to pipe in order to control the output of them
  const bazelOpts: execa.Options = {
    ...runOpts,
    stdio: 'pipe',
  };

  if (offline) {
    bazelArgs = [...bazelArgs, '--config=offline'];
  }

  const bazelProc = spawn(bazelCommandRunner, bazelArgs, bazelOpts);

  const bazelLogs$ = new Rx.Subject<string>();

  // Bazel outputs machine readable output into stdout and human readable output goes to stderr.
  // Therefore we need to get both. In order to get errors we need to parse the actual text line
  const bazelLogSubscription = Rx.merge(
    observeLines(bazelProc.stdout!).pipe(
      tap((line) => log.info(`${chalk.cyan(`[${bazelCommandRunner}]`)} ${line}`))
    ),
    observeLines(bazelProc.stderr!).pipe(
      tap((line) => log.info(`${chalk.cyan(`[${bazelCommandRunner}]`)} ${line}`))
    )
  ).subscribe(bazelLogs$);

  // Wait for process and logs to finish, unsubscribing in the end
  try {
    await bazelProc;
  } catch {
    log.error(
      'HINT: when experiencing problems with node_modules try `yarn kbn bootstrap --force-install` or `yarn kbn reset` as last resort.'
    );
    throw new CliError(`The bazel command that was running failed to complete.`);
  }
  await bazelLogs$.toPromise();
  await bazelLogSubscription.unsubscribe();
}

export async function runBazel(
  bazelArgs: string[],
  offline: boolean = false,
  runOpts: execa.Options = {}
) {
  await runBazelCommandWithRunner('bazel', bazelArgs, offline, runOpts);
}

export async function runIBazel(
  bazelArgs: string[],
  offline: boolean = false,
  runOpts: execa.Options = {}
) {
  const extendedEnv = { IBAZEL_USE_LEGACY_WATCHER: '0', ...runOpts?.env };
  await runBazelCommandWithRunner('ibazel', bazelArgs, offline, { ...runOpts, env: extendedEnv });
}
