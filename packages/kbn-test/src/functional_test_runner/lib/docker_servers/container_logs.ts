/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import * as Rx from 'rxjs';
import { tap } from 'rxjs/operators';
import { ToolingLog } from '@kbn/tooling-log';
import { observeLines } from '@kbn/stdio-dev-helpers';

/**
 * Observe the logs for a container, reflecting the log lines
 * to the ToolingLog and the returned Observable
 */
export function observeContainerLogs(name: string, containerId: string, log: ToolingLog) {
  log.debug(`[docker:${name}] streaming logs from container [id=${containerId}]`);
  const logsProc = execa('docker', ['logs', '--follow', containerId], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logLine$ = new Rx.Subject<string>();

  Rx.merge(
    observeLines(logsProc.stdout!).pipe(tap((line) => log.info(`[docker:${name}] ${line}`))), // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
    observeLines(logsProc.stderr!).pipe(tap((line) => log.error(`[docker:${name}] ${line}`))) // TypeScript note: As long as the proc stdio[2] is 'pipe', then stderr will not be null
  ).subscribe(logLine$);

  return logLine$.asObservable();
}
