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

import type { Result } from './kibana_worker';

export function kibana(log: SomeDevLog) {
  log.info('Loading core with all plugins enabled so that we can capture OAS for all...');

  const fork = ChildProcess.fork(require.resolve('./kibana_worker.ts'), {
    execArgv: ['--require=@kbn/babel-register/install'],
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  const proc$ = Rx.merge(
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
      const [result] = results as [Result];
      log.debug('message received from worker', result);
      if (result !== 'ready') throw new Error('received unexpected message from worker');
      return fork;
    })
  );

  return { proc$ };
}

function routeToLog(readable: Readable, log: SomeDevLog, level: 'debug' | 'error') {
  return observeLines(readable).pipe(
    Rx.tap((line) => {
      log[level](line);
    }),
    Rx.ignoreElements()
  );
}
