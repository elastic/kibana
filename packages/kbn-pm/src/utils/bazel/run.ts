/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import chalk from 'chalk';
import execa from 'execa';
import * as Rx from 'rxjs';
import { tap } from 'rxjs/operators';
import { observeLines } from '@kbn/dev-utils/stdio';
import { spawn } from '../child_process';
import { log } from '../log';

export async function runBazel(bazelArgs: string[], runOpts: execa.Options = {}) {
  // Force logs to pipe in order to control the output of them
  const bazelOpts: execa.Options = {
    ...runOpts,
    stdio: 'pipe',
  };

  const bazelProc = spawn('bazel', bazelArgs, bazelOpts);

  const bazelLogs$ = new Rx.Subject<string>();

  // Bazel outputs machine readable output into stdout and human readable output goes to stderr.
  // Therefore we need to get both. In order to get errors we need to parse the actual text line
  const bazelLogSubscription = Rx.merge(
    observeLines(bazelProc.stdout!).pipe(
      tap((line) => log.info(`${chalk.cyan('[bazel]')} ${line}`))
    ),
    observeLines(bazelProc.stderr!).pipe(
      tap((line) => log.info(`${chalk.cyan('[bazel]')} ${line}`))
    )
  ).subscribe(bazelLogs$);

  // Wait for process and logs to finish, unsubscribing in the end
  await bazelProc;
  await bazelLogs$.toPromise();
  await bazelLogSubscription.unsubscribe();
}
