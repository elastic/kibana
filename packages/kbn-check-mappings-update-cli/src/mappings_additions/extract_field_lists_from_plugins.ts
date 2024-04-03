/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ChildProcess from 'child_process';
import { Readable } from 'stream';
import * as Rx from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';
import { SomeDevLog } from '@kbn/some-dev-log';
import { observeLines } from '@kbn/stdio-dev-helpers';
import type { Result } from './extract_field_lists_from_plugins_worker';

/**
 * Run a worker process that starts the core with all plugins enabled and sends back the
 * registered fields for all plugins.
 *
 * We run this in a child process to make it easier to kill the kibana instance once done
 * (dodges issues with open handles), and so that we can harvest logs and feed them into
 * the logger when debugging.
 */
export async function extractFieldListsFromPlugins(log: SomeDevLog): Promise<Result> {
  log.info('Loading core with all plugins enabled so that we can get all savedObject mappings...');

  const fork = ChildProcess.fork(require.resolve('./extract_field_lists_from_plugins_worker.ts'), {
    execArgv: ['--require=@kbn/babel-register/install'],
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  const result = await Rx.firstValueFrom(
    Rx.merge(
      // the actual value we are interested in
      Rx.fromEvent(fork, 'message'),

      // worker logs are written to the logger, but dropped from the stream
      routeToLog(fork.stdout!, log, 'debug'),
      routeToLog(fork.stderr!, log, 'error'),

      // if an error occurs running the worker throw it into the stream
      Rx.fromEvent(fork, 'error').pipe(
        Rx.map((err) => {
          throw err;
        })
      )
    ).pipe(
      Rx.takeUntil(Rx.fromEvent(fork, 'exit')),
      Rx.map((results) => {
        const [outcome] = results as [Result];
        log.debug('message received from worker', outcome);
        fork.kill('SIGILL');
        return outcome;
      }),
      Rx.defaultIfEmpty(undefined)
    )
  );

  if (!result) {
    throw new Error('worker exited without sending mappings');
  }

  return result;
}

function routeToLog(readable: Readable, log: SomeDevLog, level: 'debug' | 'error') {
  return observeLines(readable).pipe(
    Rx.tap((line) => {
      log[level](line);
    }),
    Rx.ignoreElements()
  );
}
