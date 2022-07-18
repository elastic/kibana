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
import { ToolingLog } from '@kbn/tooling-log';
import { observeLines } from '@kbn/stdio-dev-helpers';

type BazelCommandRunner = 'bazel' | 'ibazel';

interface BazelRunOptions {
  log: ToolingLog;
  bazelArgs: string[];
  offline?: boolean;
  execaOpts?: execa.Options;
}

async function runBazelCommandWithRunner(runner: BazelCommandRunner, options: BazelRunOptions) {
  const bazelProc = execa(
    runner,
    options.offline ? [...options.bazelArgs, '--config=offline'] : options.bazelArgs,
    {
      ...options.execaOpts,
      stdio: 'pipe',
      preferLocal: true,
    }
  );

  await Promise.all([
    // Bazel outputs machine readable output into stdout and human readable output goes to stderr.
    // Therefore we need to get both. In order to get errors we need to parse the actual text line
    Rx.lastValueFrom(
      Rx.merge(
        observeLines(bazelProc.stdout!).pipe(
          tap((line) => options.log.info(`${chalk.cyan(`[${runner}]`)} ${line}`))
        ),
        observeLines(bazelProc.stderr!).pipe(
          tap((line) => options.log.info(`${chalk.cyan(`[${runner}]`)} ${line}`))
        )
      ).pipe(Rx.defaultIfEmpty(undefined))
    ),

    // Wait for process and logs to finish, unsubscribing in the end
    bazelProc.catch(() => {
      options.log.error(
        'HINT: If experiencing problems with node_modules try `yarn kbn bootstrap --force-install` or as last resort `yarn kbn reset && yarn kbn bootstrap`'
      );

      throw new Error(`The bazel command that was running failed to complete.`);
    }),
  ]);
}

export async function runBazel(options: BazelRunOptions) {
  await runBazelCommandWithRunner('bazel', options);
}

export async function runIBazel(options: BazelRunOptions) {
  await runBazelCommandWithRunner('ibazel', {
    ...options,
    execaOpts: {
      ...options.execaOpts,
      env: {
        ...options.execaOpts?.env,
        IBAZEL_USE_LEGACY_WATCHER: '0',
      },
    },
  });
}
