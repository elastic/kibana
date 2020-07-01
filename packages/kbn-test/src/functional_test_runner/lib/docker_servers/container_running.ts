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
import { ToolingLog } from '@kbn/dev-utils';

/**
 * Create an observable that errors if a docker
 * container exits before being unsubscribed
 */
export function observeContainerRunning(name: string, containerId: string, log: ToolingLog) {
  return new Rx.Observable((subscriber) => {
    log.debug(`[docker:${name}] watching container for exit status [${containerId}]`);

    const exitCodeProc = execa('docker', ['wait', containerId]);

    let exitCode: Error | number | null = null;
    exitCodeProc
      .then(({ stdout }) => {
        exitCode = Number.parseInt(stdout.trim(), 10);

        if (Number.isFinite(exitCode)) {
          subscriber.error(
            new Error(`container [id=${containerId}] unexpectedly exitted with code ${exitCode}`)
          );
        } else {
          subscriber.error(
            new Error(`unable to parse exit code from output of "docker wait": ${stdout}`)
          );
        }
      })
      .catch((error) => {
        if (error?.killed) {
          // ignore errors thrown because the process was killed
          subscriber.complete();
          return;
        }

        subscriber.error(
          new Error(`failed to monitor process with "docker wait": ${error.message}`)
        );
      });

    return () => {
      exitCodeProc.kill('SIGKILL');
    };
  });
}
