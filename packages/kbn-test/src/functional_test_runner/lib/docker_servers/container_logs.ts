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

import execa from 'execa';
import * as Rx from 'rxjs';
import { tap } from 'rxjs/operators';
import { ToolingLog, observeLines } from '@kbn/dev-utils';

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
    observeLines(logsProc.stdout).pipe(tap((line) => log.info(`[docker:${name}] ${line}`))),
    observeLines(logsProc.stderr).pipe(tap((line) => log.error(`[docker:${name}] ${line}`)))
  ).subscribe(logLine$);

  return logLine$.asObservable();
}
